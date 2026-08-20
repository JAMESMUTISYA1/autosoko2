"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AccountsList from "@/components/dashboard/AccountsList";

export default function AdminAccountsPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/accounts")
      .then((r) => r.json())
      .then((json) => setAccounts(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Accounts</h1>
      <p className="text-sm text-muted mb-8">Suspend or reactivate any seller or agent account. A reason is required to suspend.</p>
      {loading ? <p className="text-sm text-muted">Loading...</p> : <AccountsList initialAccounts={accounts} currentActorName={session?.user?.name || "Admin"} />}
    </div>
  );
}
