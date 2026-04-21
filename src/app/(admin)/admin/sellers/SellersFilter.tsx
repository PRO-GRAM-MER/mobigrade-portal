"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SearchBar } from "@/components/shared/SearchBar";
import { CustomSelect } from "@/components/shared/CustomSelect";
import classes from "./sellers.module.css";

const STATUS_OPTIONS = [
  { id: "",                label: "All Statuses"  },
  { id: "KYC_PENDING",    label: "Pending"        },
  { id: "KYC_SUBMITTED",  label: "Submitted"      },
  { id: "KYC_UNDER_REVIEW", label: "Under Review" },
  { id: "KYC_APPROVED",   label: "Verified"       },
  { id: "KYC_REJECTED",   label: "Rejected"       },
];

export function SellersFilter() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  const update = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set(key, val);
      else params.delete(key);
      params.delete("page"); // reset page on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className={classes.filterBar}>
      <h1 className={classes.pageTitle}>Sellers</h1>
      <SearchBar
        value={search}
        onSearch={v => update("search", v)}
        placeholder="Search by email or phone…"
        className={classes.searchWrap}
      />
      <CustomSelect
        options={STATUS_OPTIONS}
        value={status}
        defaultId=""
        onChange={v => update("status", v)}
      />
    </div>
  );
}
