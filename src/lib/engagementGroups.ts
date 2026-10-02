// Shared groupKey encoding for "one business" across its EngagementProfile platform rows.
// Must stay identical to the server-side groupWhere() decoder in actions.ts.
export function engagementGroupKey(leadId: string | null, businessName: string): string {
  return leadId ? `lead:${leadId}` : `name:${encodeURIComponent(businessName)}`;
}
