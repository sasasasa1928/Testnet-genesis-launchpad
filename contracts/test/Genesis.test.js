const { expect } = require("chai");
const { ethers } = require("hardhat");
const E = ethers.parseEther;

describe("GenesisFactory", () => {
  let f, owner, alice, bob, payout;
  const TREASURY = "0xc6D30E0B0F64Ca07942Efd3646A6e224F54ecfb9";
  const VE = E("0.1"), VT = E("1073000000");

  async function deploy(router = ethers.ZeroAddress) {
    [owner, alice, bob, payout] = await ethers.getSigners();
    f = await (await ethers.getContractFactory("GenesisFactory")).deploy(router, VE, VT);
  }
  async function launch(signer, feeBps = 100, recipient = ethers.ZeroAddress, burnBps = 0, value = 0n, holderBps = 0) {
    const tx = await f.connect(signer).createToken("Test", "TST", '{"description":"hi"}', feeBps, recipient, burnBps, holderBps, 0, { value });
    const rc = await tx.wait();
    const ev = rc.logs.map(l => { try { return f.interface.parseLog(l); } catch { return null; } }).find(e => e && e.name === "TokenCreated");
    return await ethers.getContractAt("GenesisToken", ev.args.token);
  }

  beforeEach(() => deploy());

  it("enforces 1%-10% total fee", async () => {
    await expect(f.connect(alice).createToken("A", "A", "", 99, ethers.ZeroAddress, 0, 0, 0)).to.be.revertedWithCustomError(f, "BadFee");
    await expect(f.connect(alice).createToken("A", "A", "", 1001, ethers.ZeroAddress, 0, 0, 0)).to.be.revertedWithCustomError(f, "BadFee");
    await launch(alice, 1000);
    expect(await f.tokenCount()).to.equal(1n);
  });

  it("buy splits fee 0.7% protocol / rest creator, and claim works", async () => {
    const t = await launch(alice, 300); // 3% total => 0.7% protocol, 2.3% creator
    await f.connect(bob).buy(await t.getAddress(), 0, { value: E("0.01") });
    expect(await f.claimable(TREASURY)).to.equal(E("0.00007"));
    expect(await f.claimable(alice.address)).to.equal(E("0.00023"));
    expect(await t.balanceOf(bob.address)).to.be.gt(0n);
    await expect(f.connect(alice).claim()).to.changeEtherBalance(alice, E("0.00023"));
  });

  it("initial creator buy at launch", async () => {
    const t = await launch(alice, 100, ethers.ZeroAddress, 0, E("0.005"));
    expect(await t.balanceOf(alice.address)).to.be.gt(0n);
  });

  it("sell works without approve and pays out net of fee", async () => {
    const t = await launch(alice, 100);
    const addr = await t.getAddress();
    await f.connect(bob).buy(addr, 0, { value: E("0.01") });
    const bal = await t.balanceOf(bob.address);
    const [quote] = await f.quoteSell(addr, bal);
    await expect(f.connect(bob).sell(addr, bal, quote)).to.changeEtherBalance(bob, quote);
    expect(await t.balanceOf(bob.address)).to.equal(0n);
    const c = await f.curves(addr);
    expect(c.realEth).to.be.lte(1n);
  });

  it("slippage protection", async () => {
    const t = await launch(alice, 100);
    await expect(f.connect(bob).buy(await t.getAddress(), E("999999999"), { value: E("0.01") })).to.be.revertedWithCustomError(f, "Slippage");
  });

  it("creator fee to another wallet + buyback & burn share", async () => {
    const t = await launch(alice, 1000, payout.address, 5000); // 10%: 0.7 protocol, 9.3 creator, half burned
    const addr = await t.getAddress();
    await f.connect(bob).buy(addr, 0, { value: E("0.1") });
    const creatorPart = E("0.0093");
    expect(await f.claimable(payout.address)).to.equal(creatorPart / 2n);
    expect(await f.buybackPool(addr)).to.equal(creatorPart / 2n);
    const supplyBefore = await t.totalSupply();
    await f.connect(owner).buybackAndBurn(addr);
    expect(await t.totalSupply()).to.be.lt(supplyBefore);
    expect(await f.buybackPool(addr)).to.equal(0n);
  });

  it("graduates, refunds excess, sends liquidity to treasury when no router", async () => {
    const t = await launch(alice, 100);
    const addr = await t.getAddress();
    const need = await f.ethToGraduate(addr);
    const gross = (need * 10000n) / 9900n + 10n;
    const before = await ethers.provider.getBalance(bob.address);
    const tx = await f.connect(bob).buy(addr, 0, { value: gross + E("1") });
    const rc = await tx.wait();
    const spent = before - (await ethers.provider.getBalance(bob.address)) - rc.gasUsed * rc.gasPrice;
    expect(spent).to.be.lte(gross + 1n); // excess refunded
    const c = await f.curves(addr);
    expect(c.graduated).to.equal(true);
    expect(await t.balanceOf(bob.address)).to.equal(E("800000000"));
    expect(await t.balanceOf(TREASURY)).to.equal(E("200000000"));
    await expect(f.connect(bob).buy(addr, 0, { value: E("0.01") })).to.be.revertedWithCustomError(f, "IsGraduated");
    await expect(f.connect(bob).sell(addr, 1n, 0)).to.be.revertedWithCustomError(f, "IsGraduated");
    console.log("      ETH to graduate (net):", ethers.formatEther(need));
  });

  it("graduates into the DEX router when set", async () => {
    const router = await (await ethers.getContractFactory("MockRouter")).deploy();
    await deploy(await router.getAddress());
    const t = await launch(alice, 100);
    const addr = await t.getAddress();
    await f.connect(bob).buy(addr, 0, { value: E("1") });
    expect((await f.curves(addr)).graduated).to.equal(true);
    expect(await router.lastTokens()).to.equal(E("200000000"));
    expect(await router.lastEth()).to.be.gt(0n);
    expect(await router.lastTo()).to.equal("0x000000000000000000000000000000000000dEaD");
  });

  it("treasury is hard-coded and cannot be changed", async () => {
    expect(f.interface.getFunction("setTreasury")).to.equal(null);
    expect(f.interface.getFunction("treasury")).to.equal(null); // not exposed
    const t = await launch(alice, 100);
    await f.connect(bob).buy(await t.getAddress(), 0, { value: E("0.01") });
    expect(await f.claimable(TREASURY)).to.equal(E("0.00007"));
  });

  it("creator can change fee recipient and burn share", async () => {
    const t = await launch(alice, 200);
    const addr = await t.getAddress();
    await expect(f.connect(bob).setCreatorFee(addr, bob.address, 0, 0)).to.be.revertedWithCustomError(f, "NotCreator");
    await expect(f.connect(alice).setCreatorFee(addr, payout.address, 6000, 5000)).to.be.revertedWithCustomError(f, "BadParams");
    await f.connect(alice).setCreatorFee(addr, payout.address, 4000, 6000);
    const c = await f.curves(addr);
    expect(c.feeRecipient).to.equal(payout.address);
    expect(c.burnBps).to.equal(4000n);
    expect(c.holderBps).to.equal(6000n);
  });

  describe("holder rewards", () => {
    let carol, dave;
    beforeEach(async () => { [, , , , , carol, dave] = await ethers.getSigners(); });

    it("rejects burn + holder share over 100%", async () => {
      await expect(f.connect(alice).createToken("A", "A", "", 100, ethers.ZeroAddress, 6000, 5000, 0)).to.be.revertedWithCustomError(f, "BadFee");
    });

    it("shares the holder part pro-rata and lets holders claim", async () => {
      // 10% fee: 0.7% protocol, 9.3% creator side, 100% of creator side to holders
      const t = await launch(alice, 1000, ethers.ZeroAddress, 0, 0n, 10000);
      const a = await t.getAddress();
      await f.connect(bob).buy(a, 0, { value: E("0.01") });   // first buy: nobody eligible yet -> pending
      expect(await t.pendingRewards()).to.equal(E("0.00093"));
      await f.connect(carol).buy(a, 0, { value: E("0.01") }); // bob is the only eligible holder now
      const bobC = await t.claimableRewardsOf(bob.address);
      expect(bobC).to.be.closeTo(E("0.00186"), 10n); // pending + this trade's holder fee
      expect(await t.claimableRewardsOf(carol.address)).to.equal(0n); // buyer doesn't earn its own fee
      expect(await f.claimable(alice.address)).to.equal(0n); // creator side fully to holders
      expect(await f.claimable(TREASURY)).to.equal(E("0.00014"));
      await expect(t.connect(bob).claimRewards()).to.changeEtherBalance(bob, bobC);
      expect(await t.claimableRewardsOf(bob.address)).to.equal(0n);
    });

    it("splits by balance between two holders", async () => {
      const t = await launch(alice, 1000, ethers.ZeroAddress, 0, 0n, 10000);
      const a = await t.getAddress();
      await f.connect(bob).buy(a, 0, { value: E("0.01") });
      await f.connect(carol).buy(a, 0, { value: E("0.01") });
      const before = [await t.claimableRewardsOf(bob.address), await t.claimableRewardsOf(carol.address)];
      await f.connect(dave).buy(a, 0, { value: E("0.05") });
      const gotB = (await t.claimableRewardsOf(bob.address)) - before[0];
      const gotC = (await t.claimableRewardsOf(carol.address)) - before[1];
      const bB = await t.balanceOf(bob.address), bC = await t.balanceOf(carol.address);
      // gotB / gotC == bB / bC (within rounding)
      const diff = gotB * bC - gotC * bB;
      expect(diff < 0n ? -diff : diff).to.be.lte((bB + bC) * 2n); // equal ratios, ±1 wei rounding
      expect(gotB + gotC).to.be.closeTo(E("0.00465"), 10n);
    });

    it("transfers move future rewards, not past ones", async () => {
      const t = await launch(alice, 1000, ethers.ZeroAddress, 0, 0n, 10000);
      const a = await t.getAddress();
      await f.connect(bob).buy(a, 0, { value: E("0.01") });
      await f.connect(carol).buy(a, 0, { value: E("0.01") });
      const bobBefore = await t.claimableRewardsOf(bob.address);
      await t.connect(bob).transfer(dave.address, await t.balanceOf(bob.address));
      expect(await t.claimableRewardsOf(bob.address)).to.equal(bobBefore); // kept what he earned
      expect(await t.claimableRewardsOf(dave.address)).to.equal(0n);
      await f.connect(carol).buy(a, 0, { value: E("0.01") });
      expect(await t.claimableRewardsOf(bob.address)).to.equal(bobBefore); // no longer earning
      expect(await t.claimableRewardsOf(dave.address)).to.be.gt(0n);
    });

    it("sellers stop earning; curve inventory never earns", async () => {
      const t = await launch(alice, 1000, ethers.ZeroAddress, 0, 0n, 10000);
      const a = await t.getAddress();
      expect(await t.isExcludedFromRewards(await f.getAddress())).to.equal(true);
      await f.connect(bob).buy(a, 0, { value: E("0.01") });
      await f.connect(carol).buy(a, 0, { value: E("0.01") });
      await f.connect(bob).sell(a, await t.balanceOf(bob.address), 0);
      const bobAfterSell = await t.claimableRewardsOf(bob.address);
      await f.connect(dave).buy(a, 0, { value: E("0.01") });
      expect(await t.claimableRewardsOf(bob.address)).to.equal(bobAfterSell);
    });

    it("three-way split: wallet / holders / burn", async () => {
      const t = await launch(alice, 1000, payout.address, 2000, 0n, 5000); // 30% wallet, 50% holders, 20% burn
      const a = await t.getAddress();
      await f.connect(bob).buy(a, 0, { value: E("0.1") });
      const creator = E("0.0093");
      expect(await f.claimable(payout.address)).to.equal((creator * 3000n) / 10000n);
      expect(await f.buybackPool(a)).to.equal((creator * 2000n) / 10000n);
      expect(await t.pendingRewards()).to.equal((creator * 5000n) / 10000n);
    });

    it("DEX pool is excluded at graduation", async () => {
      const router = await (await ethers.getContractFactory("MockRouter")).deploy();
      await deploy(await router.getAddress());
      const t = await launch(alice, 1000, ethers.ZeroAddress, 0, 0n, 10000);
      const a = await t.getAddress();
      await f.connect(bob).buy(a, 0, { value: E("0.01") });
      await f.connect(carol).buy(a, 0, { value: E("1") }); // graduates
      expect(await t.isExcludedFromRewards(await router.getAddress())).to.equal(true);
      expect(await t.rewardSupply()).to.equal(E("800000000"));
    });
  });

  it("lists newest tokens first", async () => {
    const a = await launch(alice); const b = await launch(bob);
    const list = await f.getTokens(0, 10);
    expect(list[0]).to.equal(await b.getAddress());
    expect(list[1]).to.equal(await a.getAddress());
  });
});
