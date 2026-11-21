const { expect } = require("chai");
const { ethers } = require("hardhat");
const E = ethers.parseEther;

describe("GenesisFactory", () => {
  let f, owner, treasury, alice, bob, payout;
  const VE = E("0.1"), VT = E("1073000000");

  async function deploy(router = ethers.ZeroAddress) {
    [owner, treasury, alice, bob, payout] = await ethers.getSigners();
    f = await (await ethers.getContractFactory("GenesisFactory")).deploy(treasury.address, router, VE, VT);
  }
  async function launch(signer, feeBps = 100, recipient = ethers.ZeroAddress, burnBps = 0, value = 0n) {
    const tx = await f.connect(signer).createToken("Test", "TST", '{"description":"hi"}', feeBps, recipient, burnBps, 0, { value });
    const rc = await tx.wait();
    const ev = rc.logs.map(l => { try { return f.interface.parseLog(l); } catch { return null; } }).find(e => e && e.name === "TokenCreated");
    return await ethers.getContractAt("GenesisToken", ev.args.token);
  }

  beforeEach(() => deploy());

  it("enforces 1%-10% total fee", async () => {
    await expect(f.connect(alice).createToken("A", "A", "", 99, ethers.ZeroAddress, 0, 0)).to.be.revertedWithCustomError(f, "BadFee");
    await expect(f.connect(alice).createToken("A", "A", "", 1001, ethers.ZeroAddress, 0, 0)).to.be.revertedWithCustomError(f, "BadFee");
    await launch(alice, 1000);
    expect(await f.tokenCount()).to.equal(1n);
  });

  it("buy splits fee 0.7% protocol / rest creator, and claim works", async () => {
    const t = await launch(alice, 300); // 3% total => 0.7% protocol, 2.3% creator
    await f.connect(bob).buy(await t.getAddress(), 0, { value: E("0.01") });
    expect(await f.claimable(treasury.address)).to.equal(E("0.00007"));
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
    expect(await t.balanceOf(treasury.address)).to.equal(E("200000000"));
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

  it("creator can change fee recipient and burn share", async () => {
    const t = await launch(alice, 200);
    const addr = await t.getAddress();
    await expect(f.connect(bob).setCreatorFee(addr, bob.address, 0)).to.be.revertedWithCustomError(f, "NotCreator");
    await f.connect(alice).setCreatorFee(addr, payout.address, 10000);
    const c = await f.curves(addr);
    expect(c.feeRecipient).to.equal(payout.address);
    expect(c.burnBps).to.equal(10000n);
  });

  it("lists newest tokens first", async () => {
    const a = await launch(alice); const b = await launch(bob);
    const list = await f.getTokens(0, 10);
    expect(list[0]).to.equal(await b.getAddress());
    expect(list[1]).to.equal(await a.getAddress());
  });
});
