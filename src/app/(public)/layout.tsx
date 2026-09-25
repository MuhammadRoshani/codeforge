import type { ReactNode } from "react";
import Header from "@/components/layout/Header";

interface RootGroupLayoutProps {
  children: ReactNode;
}

export default function RootGroupLayout({ children }: RootGroupLayoutProps) {
  return (
    <>
      <Header />
      <main style={{ paddingTop: "90px" }}>{children}</main>
    </>
  );
}
