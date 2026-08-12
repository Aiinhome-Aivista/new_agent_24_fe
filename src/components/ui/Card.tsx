import { HTMLAttributes } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`surface p-5 ${className}`} {...rest}>{children}</div>
  );
}
