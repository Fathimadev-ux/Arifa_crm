"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { type RequestStatus, useChangeRequests } from "@/lib/api/change-requests";
import { useDeals } from "@/lib/api/crm";
import { RequestCard } from "@/components/requests/RequestCard";
import { ErrorState, LoadingState, PageHeader, SegmentedControl } from "@/components/ui";

const TABS = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
] as const;

/** §13: every change request the buyer made, open ones oldest-due first. */
export function RequestsScreen() {
  const [status, setStatus] = useState<RequestStatus>("open");
  const { data: requests, error } = useChangeRequests(status);
  const { data: deals } = useDeals();
  const numberOf = (dealId: string) => deals?.find((deal) => deal.id === dealId)?.number;

  return (
    <>
      <PageHeader title="Requests" subtitle={requests ? `${requests.length} ${status}` : undefined}>
        <SegmentedControl options={TABS} value={status} onChange={setStatus} label="Status" />
      </PageHeader>

      {error && !requests ? (
        <ErrorState message={error.message} />
      ) : !requests ? (
        <LoadingState />
      ) : requests.length === 0 ? (
        <div className="animate-enter panel flex flex-col items-center py-16 text-center">
          <CircleCheck className="size-6 text-neutral-400" />
          <p className="mt-3 font-medium">No {status} requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {requests.map((request, index) => (
            <RequestCard key={request.id} request={request} dealNumber={numberOf(request.deal_id)} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
