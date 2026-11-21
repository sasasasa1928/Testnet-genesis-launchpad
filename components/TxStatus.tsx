import { EXPLORER } from "@/lib/config";

type S = { kind: "idle" | "pending" | "ok" | "error"; msg?: string; hash?: string };

export function TxStatus({ status }: { status: S }) {
  if (status.kind === "idle") return null;
  const cls = status.kind === "error" ? "notice err" : status.kind === "ok" ? "notice ok" : "notice";
  return (
    <div className={cls}>
      {status.msg}
      {status.hash && (
        <>
          {" · "}
          <a href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            view on Etherscan
          </a>
        </>
      )}
    </div>
  );
}
