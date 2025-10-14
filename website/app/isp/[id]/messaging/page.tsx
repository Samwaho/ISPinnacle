"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AccessDenied } from "@/components/ui/access-denied";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type OrganizationCustomerStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";
type MessagingCustomer = {
  id: string;
  name: string;
  phone?: string | null;
  status: OrganizationCustomerStatus;
  station?: { id: string } | null;
  package?: { id: string } | null;
};

const MessagingPage = () => {
  const { id } = useParams();
  const organizationId = id as string;
  const t = useTRPC();

  // Permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );

  // Datasets
  const { data: customers, isPending: customersLoading } = useQuery(
    t.customer.getCustomers.queryOptions({ organizationId })
  );

  const { data: stations, isPending: stationsLoading } = useQuery(
    t.stations.getStations.queryOptions({ organizationId })
  );

  const { data: packages, isPending: packagesLoading } = useQuery(
    t.packages.getPackages.queryOptions({ organizationId })
  );

  // Templates
  const { data: templates, isPending: templatesLoading } = useQuery(
    t.sms.getSmsTemplates.queryOptions({ organizationId })
  );

  const canManageSms = userPermissions?.canManageSms || false;

  // Mutations
  const { mutate: sendSms, isPending: isSendingSingle } = useMutation(
    t.sms.sendSms.mutationOptions({
      onSuccess: () => toast.success("SMS sent successfully"),
      onError: (e) => toast.error(e.message || "Failed to send SMS"),
    })
  );

  const { mutate: sendBulkSms, isPending: isSendingBulk } = useMutation(
    t.sms.sendBulkSms.mutationOptions({
      onSuccess: (res) => toast.success(res.message ?? "Bulk SMS sent"),
      onError: (e) => toast.error(e.message || "Failed to send bulk SMS"),
    })
  );

  const { mutate: sendTemplateSms, isPending: isSendingTemplate } = useMutation(
    t.sms.sendTemplateSms.mutationOptions({
      onSuccess: () => toast.success("Template SMS sent successfully"),
      onError: (e) => toast.error(e.message || "Failed to send template SMS"),
    })
  );

  const { mutate: sendBulkTemplateSms, isPending: isSendingBulkTemplate } = useMutation(
    t.sms.sendBulkTemplateSms.mutationOptions({
      onSuccess: (res) => toast.success(res.message ?? "Bulk template SMS sent"),
      onError: (e) => toast.error(e.message || "Failed to send bulk template SMS"),
    })
  );

  // Manual tab state
  const [manualPhone, setManualPhone] = React.useState("");
  const [manualMessage, setManualMessage] = React.useState("");

  // Customer tab state
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [customerMessage, setCustomerMessage] = React.useState("");
  const [useCustomerTemplate, setUseCustomerTemplate] = React.useState(false);
  const [customerTemplateName, setCustomerTemplateName] = React.useState<string>("");
  const [customerTemplateVars, setCustomerTemplateVars] = React.useState<Record<string, string>>({});

  // Group tab state
  type GroupFilter = "ALL" | "STATION" | "PACKAGE" | "STATUS";
  const [groupFilter, setGroupFilter] = React.useState<GroupFilter>("ALL");
  const [groupStationId, setGroupStationId] = React.useState<string>("");
  const [groupPackageId, setGroupPackageId] = React.useState<string>("");
  const [groupStatus, setGroupStatus] = React.useState<"ACTIVE" | "INACTIVE" | "EXPIRED" | "">("");
  const [groupMessage, setGroupMessage] = React.useState("");
  const [useGroupTemplate, setUseGroupTemplate] = React.useState(false);
  const [groupTemplateName, setGroupTemplateName] = React.useState<string>("");
  const [groupTemplateVars, setGroupTemplateVars] = React.useState<Record<string, string>>({});

  // Manual tab template state
  const [useManualTemplate, setUseManualTemplate] = React.useState(false);
  const [manualTemplateName, setManualTemplateName] = React.useState<string>("");
  const [manualTemplateVars, setManualTemplateVars] = React.useState<Record<string, string>>({});

  const selectedManualTemplate = React.useMemo(() => {
    const list = templates || [];
    return list.find((t) => t.name === manualTemplateName);
  }, [templates, manualTemplateName]);

  const selectedCustomerTemplate = React.useMemo(() => {
    const list = templates || [];
    return list.find((t) => t.name === customerTemplateName);
  }, [templates, customerTemplateName]);

  const selectedGroupTemplate = React.useMemo(() => {
    const list = templates || [];
    return list.find((t) => t.name === groupTemplateName);
  }, [templates, groupTemplateName]);

  // Helpers
  const selectedCustomer = React.useMemo(() => {
    const list = (customers as unknown as MessagingCustomer[]) || [];
    if (!list.length || !selectedCustomerId) return null;
    return list.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const filteredRecipients = React.useMemo(() => {
    const list = (customers as unknown as MessagingCustomer[]) || [];
    let filtered: MessagingCustomer[] = list;
    if (groupFilter === "STATION" && groupStationId) {
      filtered = list.filter((c) => c.station?.id === groupStationId);
    } else if (groupFilter === "PACKAGE" && groupPackageId) {
      filtered = list.filter((c) => c.package?.id === groupPackageId);
    } else if (groupFilter === "STATUS" && groupStatus) {
      filtered = list.filter((c) => c.status === groupStatus);
    }
    return filtered.filter((c) => !!c.phone);
  }, [customers, groupFilter, groupStationId, groupPackageId, groupStatus]);

  // Loading/permission gate
  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3 grid-cols-1">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (!canManageSms) {
    return (
      <div className="my-8">
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to send messages in this organization."
          showBackButton={true}
          backButtonLabel="Back to Organization"
          backButtonLink={`/organization/${organizationId}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Messaging</h3>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="group">Group</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-base font-semibold">Manual Message</div>
                <div className="text-sm text-muted-foreground">Send a one-off message or use a template</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Use Template</span>
                <Switch checked={useManualTemplate} onCheckedChange={setUseManualTemplate} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manualPhone">Phone Number</Label>
                <Input
                  id="manualPhone"
                  placeholder="e.g. 2547XXXXXXXX"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
              </div>
            </div>
            {!useManualTemplate ? (
              <div className="space-y-2">
                <Label htmlFor="manualMessage">Message</Label>
                <Textarea
                  id="manualMessage"
                  rows={5}
                  placeholder="Type your message..."
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  {templatesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={manualTemplateName} onValueChange={setManualTemplateName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {(templates || []).map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedManualTemplate && selectedManualTemplate.variables.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedManualTemplate.variables.map((v: string) => (
                      <div className="space-y-2" key={v}>
                        <Label htmlFor={`manual-var-${v}`}>{v}</Label>
                        <Input
                          id={`manual-var-${v}`}
                          placeholder={`Enter ${v}`}
                          value={manualTemplateVars[v] || ""}
                          onChange={(e) =>
                            setManualTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="gradient"
                disabled={
                  !manualPhone ||
                  (!useManualTemplate && !manualMessage) ||
                  (useManualTemplate && (!manualTemplateName || isSendingTemplate)) ||
                  (!useManualTemplate && isSendingSingle)
                }
                onClick={() => {
                  if (useManualTemplate) {
                    sendTemplateSms({
                      organizationId,
                      templateName: manualTemplateName,
                      phoneNumber: manualPhone,
                      variables: manualTemplateVars,
                    });
                  } else {
                    sendSms({ organizationId, phoneNumber: manualPhone, message: manualMessage });
                  }
                }}
              >
                {useManualTemplate
                  ? isSendingTemplate
                    ? "Sending..."
                    : "Send Template"
                  : isSendingSingle
                    ? "Sending..."
                    : "Send"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="customer">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-base font-semibold">Customer Message</div>
                <div className="text-sm text-muted-foreground">Send to a selected customer or use a template</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Use Template</span>
                <Switch checked={useCustomerTemplate} onCheckedChange={setUseCustomerTemplate} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Select Customer</Label>
                {customersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : "(no phone)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={selectedCustomer?.phone || ""} readOnly placeholder="Auto-filled" />
              </div>
            </div>
            {!useCustomerTemplate ? (
              <div className="space-y-2">
                <Label htmlFor="customerMessage">Message</Label>
                <Textarea
                  id="customerMessage"
                  rows={5}
                  placeholder="Type your message..."
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  {templatesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={customerTemplateName} onValueChange={setCustomerTemplateName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {(templates || []).map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedCustomerTemplate && selectedCustomerTemplate.variables.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedCustomerTemplate.variables.map((v: string) => (
                      <div className="space-y-2" key={v}>
                        <Label htmlFor={`cust-var-${v}`}>{v}</Label>
                        <Input
                          id={`cust-var-${v}`}
                          placeholder={`Enter ${v}`}
                          value={customerTemplateVars[v] || ""}
                          onChange={(e) =>
                            setCustomerTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="gradient"
                disabled={
                  !selectedCustomer ||
                  !selectedCustomer.phone ||
                  (!useCustomerTemplate && !customerMessage) ||
                  (useCustomerTemplate && !customerTemplateName) ||
                  (useCustomerTemplate ? isSendingTemplate : isSendingSingle)
                }
                onClick={() => {
                  if (!selectedCustomer?.phone) return;
                  if (useCustomerTemplate) {
                    sendTemplateSms({
                      organizationId,
                      templateName: customerTemplateName,
                      phoneNumber: selectedCustomer.phone,
                      variables: customerTemplateVars,
                    });
                  } else {
                    sendSms({
                      organizationId,
                      phoneNumber: selectedCustomer.phone,
                      message: customerMessage,
                    });
                  }
                }}
              >
                {useCustomerTemplate
                  ? isSendingTemplate
                    ? "Sending..."
                    : "Send Template"
                  : isSendingSingle
                    ? "Sending..."
                    : "Send"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="group">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-base font-semibold">Group Message</div>
                <div className="text-sm text-muted-foreground">Send to filtered customers or use a template</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Use Template</span>
                <Switch checked={useGroupTemplate} onCheckedChange={setUseGroupTemplate} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Filter By</Label>
                <Select value={groupFilter} onValueChange={(v: GroupFilter) => setGroupFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Customers</SelectItem>
                    <SelectItem value="STATION">Station</SelectItem>
                    <SelectItem value="PACKAGE">Package</SelectItem>
                    <SelectItem value="STATUS">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {groupFilter === "STATION" && (
                <div className="space-y-2">
                  <Label>Station</Label>
                  {stationsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={groupStationId} onValueChange={setGroupStationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose station" />
                      </SelectTrigger>
                      <SelectContent>
                        {(stations || []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {groupFilter === "PACKAGE" && (
                <div className="space-y-2">
                  <Label>Package</Label>
                  {packagesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={groupPackageId} onValueChange={setGroupPackageId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose package" />
                      </SelectTrigger>
                      <SelectContent>
                        {(packages || []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {groupFilter === "STATUS" && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={groupStatus}
                    onValueChange={(v: "ACTIVE" | "INACTIVE" | "EXPIRED") => setGroupStatus(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!useGroupTemplate ? (
              <div className="space-y-2">
                <Label htmlFor="groupMessage">Message</Label>
                <Textarea
                  id="groupMessage"
                  rows={5}
                  placeholder="Type your message to send to the selected group..."
                  value={groupMessage}
                  onChange={(e) => setGroupMessage(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  {templatesLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={groupTemplateName} onValueChange={setGroupTemplateName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {(templates || []).map((t) => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedGroupTemplate && selectedGroupTemplate.variables.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedGroupTemplate.variables.map((v: string) => (
                      <div className="space-y-2" key={v}>
                        <Label htmlFor={`group-var-${v}`}>{v}</Label>
                        <Input
                          id={`group-var-${v}`}
                          placeholder={`Enter ${v} (applies to all recipients)`}
                          value={groupTemplateVars[v] || ""}
                          onChange={(e) =>
                            setGroupTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Recipients ready: {filteredRecipients.length}
            </div>

            <div className="flex justify-end">
              <Button
                variant="gradient"
                disabled={
                  filteredRecipients.length === 0 ||
                  (!useGroupTemplate && !groupMessage) ||
                  (useGroupTemplate && !groupTemplateName) ||
                  (useGroupTemplate ? isSendingBulkTemplate : isSendingBulk)
                }
                onClick={() => {
                  if (useGroupTemplate) {
                    sendBulkTemplateSms({
                      organizationId,
                      templateName: groupTemplateName,
                      recipients: filteredRecipients.map((c) => ({
                        phoneNumber: c.phone!,
                        variables: groupTemplateVars,
                      })),
                    });
                  } else {
                    sendBulkSms({
                      organizationId,
                      recipients: filteredRecipients.map((c) => ({
                        phoneNumber: c.phone!,
                        message: groupMessage,
                      })),
                    });
                  }
                }}
              >
                {useGroupTemplate
                  ? isSendingBulkTemplate
                    ? "Sending..."
                    : `Send Template to ${filteredRecipients.length}`
                  : isSendingBulk
                    ? "Sending..."
                    : `Send to ${filteredRecipients.length}`}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessagingPage;


