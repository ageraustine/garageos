// Dashboard listing detail - redirects to public marketplace
"use client";

import { useParams, redirect } from "next/navigation";

export default function DashboardListingDetailPage() {
  const params = useParams();
  redirect(`/marketplace/listings/${params.id}`);
}
