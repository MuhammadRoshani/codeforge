"use client";

import useAuth from "@/hooks/useAuth";

export default function AdminPage() {
  const { logout } = useAuth();

  return (
    <>
      <h1>AdminPage</h1>
      <button onClick={logout}>exit</button>
    </>
  );
}
