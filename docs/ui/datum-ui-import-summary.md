# datum-ui Import Summary

> All files importing from `@datum-ui/`, excluding:
>
> - data-table, form, and task-queue component internals
> - internal datum-ui components (files inside `app/modules/datum-ui/`)
>
> **~235 files** across the codebase.

## Top Imports by Frequency

| Import           | Files |
| ---------------- | ----- |
| Icon             | ~95   |
| Button           | ~91   |
| Card/CardContent | ~89   |
| Form (consumer)  | ~72   |
| toast            | ~56   |
| Tooltip          | ~30   |
| Badge            | ~28   |
| SpinnerIcon      | ~15   |
| Dialog           | ~12   |
| Skeleton         | ~11   |

---

## Root & Layouts

| File                               | Imports                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `app/root.tsx`                     | Toaster, useToast, configureProgress, startProgress, stopProgress |
| `app/layouts/dashboard.layout.tsx` | SidebarInset, SidebarProvider, useSidebar, AppSidebar, NavItem    |
| `app/layouts/sub/sub.layout.tsx`   | NavMain, useSidebar, NavItem                                      |
| `app/layouts/sub/sub.types.ts`     | NavItem                                                           |

---

## Header Components

| File                               | Imports                                  |
| ---------------------------------- | ---------------------------------------- |
| `header/breadcrumb.tsx`            | Icon                                     |
| `header/header.tsx`                | Button, Skeleton, Tooltip, Icon, NavItem |
| `header/mobile-switcher-sheet.tsx` | Skeleton, SpinnerIcon, Icon, MobileSheet |
| `header/org-project-switcher.tsx`  | Skeleton                                 |
| `header/org-switcher.tsx`          | Icon                                     |
| `header/project-switcher.tsx`      | Button, SpinnerIcon, Icon                |
| `header/search-bar.tsx`            | Button                                   |
| `header/user-dropdown.tsx`         | Button, Icon                             |

---

## Badge / Status Components

| File                                | Imports                                 |
| ----------------------------------- | --------------------------------------- |
| `badge/badge-copy.tsx`              | Badge, Tooltip, toast, Icon             |
| `badge/badge-status.tsx`            | Badge, Tooltip, SpinnerIcon, BadgeProps |
| `chips-overflow/chips-overflow.tsx` | Badge, BadgeProps                       |
| `personal-badge/personal-badge.tsx` | Badge                                   |

---

## Card / Dialog / Error Components

| File                                          | Imports                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `danger-card/danger-card.tsx`                 | Button, Card, CardContent, Icon                                         |
| `note-card/note-card.tsx`                     | Card, CardContent, CardHeader, CardTitle, Icon                          |
| `confirmation-dialog/confirmation-dialog.tsx` | Alert, AlertDescription, AlertTitle, Button, Input, Label, Dialog, Icon |
| `error/auth.tsx`                              | Card, CardContent, SpinnerIcon                                          |
| `error/generic.tsx`                           | Button, Card, CardContent, Icon                                         |
| `waiting-page/waiting-page.tsx`               | Card, CardContent, CardFooter, SpinnerIcon                              |
| `coming-soon/coming-soon-feature-card.tsx`    | Button, Card, CardContent                                               |

---

## Input / Select / Field Components

| File                                          | Imports                           |
| --------------------------------------------- | --------------------------------- |
| `field/field-label.tsx`                       | Tooltip, Label                    |
| `input-name/input-name.tsx`                   | Checkbox, Input, Label, Tooltip   |
| `key-value-form-dialog.tsx`                   | Form                              |
| `multi-select/multi-select.tsx`               | Badge, LoaderOverlay, MobileSheet |
| `select-autocomplete/select-autocomplete.tsx` | Button, LoaderOverlay             |
| `select-box/select-box.tsx`                   | LoaderOverlay                     |
| `select-organization/select-organization.tsx` | Button, SpinnerIcon, toast, Icon  |
| `select-annotations/select-annotations.tsx`   | toast                             |
| `select-group/select-group.tsx`               | toast                             |
| `select-labels/select-labels.tsx`             | toast                             |
| `select-member/select-member.tsx`             | toast                             |
| `select-project/select-project.tsx`           | toast                             |
| `select-role/select-role.tsx`                 | toast                             |

---

## Text / Copy / Display

| File                               | Imports                                         |
| ---------------------------------- | ----------------------------------------------- |
| `text-copy/text-copy.tsx`          | Button, Tooltip, toast                          |
| `text-copy/text-copy-box.tsx`      | Button, toast                                   |
| `date-time/date-time.tsx`          | Tooltip                                         |
| `metadata/metadata-form.tsx`       | Form                                            |
| `metadata/metadata-preview.tsx`    | Badge                                           |
| `code-editor/code-editor-tabs.tsx` | Tabs, TabsContent, TabsList, TabsTrigger, toast |

---

## Navigation

| File                                     | Imports                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `sub-navigation/sub-navigation-tabs.tsx` | Tabs, TabsLinkTrigger, TabsList                                              |
| `mobile-menu/mobile-menu.tsx`            | Button, Sheet, SheetContent, SheetTrigger, SidebarProvider, NavItem, NavMain |
| `back-button/back-button.tsx`            | Button, ButtonProps, Icon                                                    |

---

## Notification

| File                                                            | Imports                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `notification/notification-bell.tsx`                            | Tooltip, Icon                                              |
| `notification/notification-dropdown.tsx`                        | ResponsiveDropdown                                         |
| `notification/items/invitation-notification-item.tsx`           | Button, toast                                              |
| `notification-settings/notification-checkbox-item.tsx`          | Form                                                       |
| `notification-settings/notification-settings-card.tsx`          | Card, CardContent, CardFooter, CardHeader, CardTitle, Form |
| `notification-settings/notification-settings-card-skeleton.tsx` | Skeleton                                                   |

---

## Features: Edge - DNS Records

| File                                                              | Imports                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `dns-records/dns-record-ai-edge-cell.tsx`                         | Button, Tooltip, Icon                                                         |
| `dns-records/dns-record-card.tsx`                                 | Card, CardContent, CardHeader, CardTitle                                      |
| `dns-records/dns-record-modal-form.tsx`                           | Dialog                                                                        |
| `dns-records/dns-record-table.tsx`                                | Badge, Icon, Tooltip                                                          |
| `dns-records/types.ts`                                            | EmptyContentProps                                                             |
| `dns-records/import-export/dns-record-import-action.tsx`          | Alert, Button, Dialog, Dropzone, DropzoneEmptyState, Icon, ResponsiveDropdown |
| `dns-records/import-export/components/dropzone-state-content.tsx` | SpinnerIcon, DropzoneContent, Icon                                            |
| `dns-records/import-export/components/import-result-table.tsx`    | Badge, Tooltip, Icon                                                          |
| `dns-records/import-export/hooks/use-dns-record-export.ts`        | toast                                                                         |

---

## Features: Edge - DNS Zone

| File                                                 | Imports                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `dns-zone/discovery-preview.tsx`                     | Icon                                                       |
| `dns-zone/dns-zone-form-dialog.tsx`                  | toast, Form                                                |
| `dns-zone/components/refresh-nameservers-button.tsx` | Button, ButtonProps, toast, Icon                           |
| `dns-zone/form/dns-record-form.tsx`                  | Button, toast, Form, LoaderOverlay                         |
| `dns-zone/form/types/*.tsx` (9 record types)         | Form                                                       |
| `dns-zone/overview/coming-soon-card.tsx`             | Col, Row                                                   |
| `dns-zone/overview/description-form-card.tsx`        | Form                                                       |
| `dns-zone/overview/task-nameserver-card.tsx`         | Card, CardContent, CardHeader, CardTitle, Icon             |
| `dns-zone/overview/task-record-card.tsx`             | Card, CardContent, CardHeader, CardTitle, LinkButton, Icon |

---

## Features: Edge - Domain

| File                                          | Imports                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `domain/domain-form-dialog.tsx`               | toast, Form                                                                  |
| `domain/expiration.tsx`                       | Badge                                                                        |
| `domain/select-domain.tsx`                    | Button, AutocompleteOption, AutocompleteProps, useFieldContext, Autocomplete |
| `domain/bulk-add/bulk-add-domains-action.tsx` | Button, Dialog, toast, FileInputButton, Form, Icon, ResponsiveDropdown       |
| `domain/overview/general-card.tsx`            | Badge, Card, CardContent, LinkButton, Tooltip                                |
| `domain/overview/quick-setup-card.tsx`        | Button, Card, CardContent, toast, Icon                                       |
| `domain/overview/verification-card.tsx`       | Card, CardContent, Tooltip, toast, Icon, useCopyToClipboard                  |

---

## Features: Edge - Proxy

| File                                      | Imports                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `proxy/proxy-basic-auth-dialog.tsx`       | Alert, Button, toast, Form, Input, Icon, InputWithAddons |
| `proxy/proxy-display-name-dialog.tsx`     | toast, Form                                              |
| `proxy/proxy-form-dialog.tsx`             | toast, Form                                              |
| `proxy/proxy-hostnames-dialog.tsx`        | toast, Form                                              |
| `proxy/proxy-origins-dialog.tsx`          | toast, Form                                              |
| `proxy/proxy-waf-dialog.tsx`              | toast, Form                                              |
| `proxy/form/hostnames-field.tsx`          | Button, Form, useFormContext, Icon                       |
| `proxy/form/protocol-endpoint-input.tsx`  | Form, InputWithAddons                                    |
| `proxy/form/subdomain-hostname-field.tsx` | useFieldContext, Skeleton                                |
| `proxy/form/tls-field.tsx`                | Form                                                     |
| `proxy/metrics/connector-sparkline.tsx`   | SpinnerIcon                                              |
| `proxy/metrics/proxy-sparkline.tsx`       | SpinnerIcon                                              |
| `proxy/overview/active-pops-card.tsx`     | Button, Card, CardContent, Skeleton, SpinnerIcon, Icon   |
| `proxy/overview/config-card.tsx`          | Badge, Card, CardContent, Skeleton, Tooltip, toast, Icon |
| `proxy/overview/general-card.tsx`         | Card, CardContent, Skeleton, Tooltip, Icon               |
| `proxy/overview/grafana-setup-card.tsx`   | Button, Card, CardContent, Icon                          |
| `proxy/overview/hostnames-card.tsx`       | Button, Card, CardContent, Tooltip, Icon                 |
| `proxy/overview/origins-card.tsx`         | Button, Card, CardContent, Icon                          |

---

## Features: Edge - Nameservers

| File                               | Imports                                  |
| ---------------------------------- | ---------------------------------------- |
| `nameservers/nameserver-card.tsx`  | Card, CardContent, CardHeader, CardTitle |
| `nameservers/nameserver-table.tsx` | Badge, EmptyContentProps                 |

---

## Features: Metrics / Export Policies

| File                                                   | Imports                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `export-policies/sinks-table.tsx`                      | Badge, Button, Card, CardContent, CardHeader, CardTitle, Icon, MobileSheet |
| `export-policies/sources-table.tsx`                    | Button, Card, CardContent, CardHeader, CardTitle, Icon, MobileSheet        |
| `export-policies/card/coming-soon-card.tsx`            | Card, CardContent                                                          |
| `export-policies/card/general-card.tsx`                | Card, CardContent, CardHeader, CardTitle, LinkButton                       |
| `export-policies/card/grafana-card.tsx`                | Button, Card, CardContent                                                  |
| `export-policies/card/activity-card.tsx`               | Card, CardContent, CardHeader, CardTitle                                   |
| `export-policies/form/stepper-form.tsx`                | Button, Card, Form, StepConfig, Icon, LoaderOverlay                        |
| `export-policies/form/update-form.tsx`                 | Button, toast, Form, Icon                                                  |
| `export-policies/form/sink/*.tsx`                      | Form, Badge, Tooltip, Icon                                                 |
| `export-policies/form/source/*.tsx`                    | Button, Form, Badge, Tooltip, Icon                                         |
| `export-policies/providers/grafana/grafana-dialog.tsx` | LinkButton, Dialog                                                         |
| `export-policies/providers/grafana/grafana-form.tsx`   | LinkButton, toast, Dialog, Form                                            |

---

## Features: Organization / Team

| File                                              | Imports                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `organization/list-card.tsx`                      | Icon                                                                   |
| `organization/cards/create-organization-card.tsx` | Card, CardContent, CardDescription, CardTitle, Icon                    |
| `organization/cards/organization-card.tsx`        | Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Icon |
| `organization/settings/danger-card.tsx`           | toast                                                                  |
| `organization/settings/general-card.tsx`          | Button, Card, toast, Form                                              |
| `organization/team/group-header.tsx`              | Icon                                                                   |
| `organization/team/invitation-form.tsx`           | TagsInput, Form, FormFieldRenderProps                                  |
| `organization/team/manage-members-dialog.tsx`     | Button, Dialog, Input, toast, Icon                                     |
| `organization/team/manage-role.tsx`               | toast, Form                                                            |
| `organization/team/groups/group-form.tsx`         | Button, Form                                                           |
| `organization/team/roles/action-bar.tsx`          | Button                                                                 |
| `organization/team/roles/add-role-screen.tsx`     | Icon                                                                   |
| `organization/team/roles/role-row.tsx`            | Badge, Button, Tooltip, Icon                                           |
| `organization/team/roles/roles-panel.tsx`         | Button, Tooltip, Icon                                                  |

---

## Features: Account

| File                                    | Imports                                                   |
| --------------------------------------- | --------------------------------------------------------- |
| `account/cards/2fa-card.tsx`            | Icon                                                      |
| `account/cards/danger-card.tsx`         | toast                                                     |
| `account/cards/identity-card.tsx`       | Icon                                                      |
| `account/cards/newsletter-card.tsx`     | Card, CardContent, CardHeader, CardTitle, Label, Switch   |
| `account/cards/notification-card.tsx`   | toast                                                     |
| `account/cards/profile-card.tsx`        | Button, Card, toast, Form                                 |
| `account/cards/sign-in-method-card.tsx` | Icon                                                      |
| `account/cards/team-auth-card.tsx`      | Card, CardContent, CardDescription, CardHeader, CardTitle |
| `account/identity-item-skeleton.tsx`    | Skeleton                                                  |

---

## Features: Other

| File                                                 | Imports                                               |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `notes/note-card.tsx`                                | Button, RichTextContent                               |
| `notes/note-form-dialog.tsx`                         | toast, Form, RichTextEditor                           |
| `notes/notes-section.tsx`                            | Button, Card, CardContent, toast, Icon, LoaderOverlay |
| `policy-binding/policy-binding.helpers.tsx`          | Badge, Button, Tooltip, Icon                          |
| `policy-binding/form/policy-binding-form-dialog.tsx` | Button, toast, Form, Input, Icon                      |
| `project/dashboard.tsx`                              | Button, Card, Skeleton, SpinnerIcon, Icon             |
| `project/settings/danger-card.tsx`                   | toast                                                 |
| `project/settings/general-card.tsx`                  | Button, Card, toast, Form                             |
| `project-bottom-bar/project-bottom-bar.tsx`          | Button, Icon, Skeleton, Tooltip                       |
| `project-bottom-bar/chat/*.tsx`                      | Button, Icon, Tooltip                                 |
| `quotas/quotas-table.tsx`                            | Button, Icon                                          |
| `secret/form/key-value-field-array.tsx`              | Button, Form, Input, Textarea, Icon                   |
| `secret/form/secret-form-dialog.tsx`                 | toast, Form                                           |
| `secret/form/edit/*.tsx`                             | Button, Card, toast, Form, Icon                       |
| `secret/form/keys/keys-form-dialog.tsx`              | toast, Form                                           |
| `secret/form/overview/general-card.tsx`              | Card, CardContent, CardHeader, CardTitle              |
| `activity-log/activity-log-columns.tsx`              | Badge                                                 |
| `activity-log/activity-log-table.tsx`                | Button, Icon, toast                                   |
| `activity-log/use-activity-log-table.ts`             | deserializeTimeRange                                  |
| `connectors/connector-download-card.tsx`             | Button, Card, CardContent, CloseIcon, LinkButton      |

---

## Routes (~65 files)

| Area                  | Files | Common Imports                                           |
| --------------------- | ----- | -------------------------------------------------------- |
| Account settings      | 5     | Col, Row, PageTitle, Button, Badge                       |
| Auth/Fraud/Invitation | 5     | SpinnerIcon, Card, Button, Icon                          |
| Onboarding            | 1     | Card, toast, Form                                        |
| Org detail            | 12    | toast, Badge, Button, Icon, NavItem, Col, Row, PageTitle |
| Project detail        | 18    | Button, toast, Icon, Col, Row, NavItem, PageTitle, Card  |
| Test routes           | 3     | Button, Badge, Card, toast                               |
| Not found             | 1     | Button, Card, Icon                                       |

### Account Routes

| File                                   | Imports                             |
| -------------------------------------- | ----------------------------------- |
| `account/settings/general.tsx`         | Col, Row, PageTitle                 |
| `account/settings/layout.tsx`          | PageTitle                           |
| `account/settings/security.tsx`        | Col, Row                            |
| `account/settings/access-tokens.tsx`   | Button, CloseIcon, Col, Icon, Row   |
| `account/settings/active-sessions.tsx` | Badge, Icon, toast                  |
| `account/organizations/index.tsx`      | Button, Col, Row, toast, Form, Icon |

### Auth / Fraud / Invitation Routes

| File                              | Imports                         |
| --------------------------------- | ------------------------------- |
| `auth/callback.tsx`               | SpinnerIcon                     |
| `fraud/account-suspended.tsx`     | Card, CardContent               |
| `fraud/account-under-review.tsx`  | Card, CardContent               |
| `fraud/verifying.tsx`             | Card, CardContent               |
| `invitation/index.tsx`            | Button, SpinnerIcon, Icon       |
| `onboarding/complete-profile.tsx` | Card, CardContent, toast, Form  |
| `not-found.tsx`                   | Button, Card, CardContent, Icon |

### Organization Routes

| File                                      | Imports                      |
| ----------------------------------------- | ---------------------------- |
| `org/detail/layout.tsx`                   | NavItem                      |
| `org/detail/projects/index.tsx`           | Button, Col, Row, Form, Icon |
| `org/detail/settings/general.tsx`         | Col, Row                     |
| `org/detail/settings/layout.tsx`          | PageTitle                    |
| `org/detail/settings/notifications.tsx`   | Col, Row                     |
| `org/detail/settings/policy-bindings.tsx` | Button, toast, Icon          |
| `org/detail/team/create-group.tsx`        | toast                        |
| `org/detail/team/group-detail.tsx`        | toast                        |
| `org/detail/team/groups.tsx`              | Badge, Button, toast, Icon   |
| `org/detail/team/index.tsx`               | Badge, Button, toast, Icon   |
| `org/detail/team/invite.tsx`              | toast                        |
| `org/detail/team/member-roles.tsx`        | toast                        |

### Project Routes

| File                                              | Imports                                                     |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `project/detail/home.tsx`                         | Col, Icon, Row                                              |
| `project/detail/layout.tsx`                       | toast, NavItem                                              |
| `project/detail/connectors/index.tsx`             | Button, Tooltip                                             |
| `project/detail/dns-zones/index.tsx`              | Icon                                                        |
| `project/detail/dns-zones/detail/dns-records.tsx` | Button, toast, Icon                                         |
| `project/detail/dns-zones/detail/layout.tsx`      | NavItem                                                     |
| `project/detail/dns-zones/detail/nameservers.tsx` | Col, Row, Icon                                              |
| `project/detail/dns-zones/detail/overview.tsx`    | Col, LinkButton, Row, Icon, PageTitle                       |
| `project/detail/dns-zones/detail/settings.tsx`    | Col, Row, PageTitle                                         |
| `project/detail/domains/index.tsx`                | Icon                                                        |
| `project/detail/domains/detail/layout.tsx`        | NavItem                                                     |
| `project/detail/domains/detail/overview.tsx`      | Button, Col, Row, toast, Icon, PageTitle                    |
| `project/detail/domains/detail/settings.tsx`      | Col, Row, toast, PageTitle                                  |
| `project/detail/edge/index.tsx`                   | Badge, Button, Tooltip, toast, Icon                         |
| `project/detail/edge/detail/index.tsx`            | Button, Card, CardContent, Col, Icon, Row, toast, PageTitle |
| `project/detail/metrics/index.tsx`                | Button, toast, Icon                                         |
| `project/detail/metrics/layout.tsx`               | NavItem                                                     |
| `project/detail/metrics/new.tsx`                  | Col, Row, PageTitle                                         |
| `project/detail/metrics/detail/overview.tsx`      | Col, Row, PageTitle                                         |
| `project/detail/secrets/index.tsx`                | Badge, Button, toast, Icon                                  |
| `project/detail/secrets/detail/overview.tsx`      | Col, Row, PageTitle                                         |
| `project/detail/settings/general.tsx`             | Col, Row                                                    |
| `project/detail/settings/layout.tsx`              | PageTitle                                                   |
| `project/detail/settings/notifications.tsx`       | Col, Row                                                    |

### Test Routes

| File                                                  | Imports                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `test/demo.tsx`                                       | Button, Tooltip                                                   |
| `test/metrics.tsx`                                    | Badge, Card, CardContent, CardHeader, CardTitle                   |
| `test/dns-record/dns-record.tsx`                      | Button, toast                                                     |
| `test/dns-record/components/dns-record-test-card.tsx` | Button, Card, CardContent, CardDescription, CardHeader, CardTitle |

---

## Metrics Module

| File                                     | Imports                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `base-metric.tsx`                        | Alert, Card, CardContent, CardDescription, CardHeader, CardTitle, Icon |
| `metric-card.tsx`                        | Icon                                                                   |
| `metrics-toolbar.tsx`                    | Card, CardContent                                                      |
| `controls/refresh-control.tsx`           | Button, Tooltip, Icon                                                  |
| `controls/step-control.tsx`              | Button                                                                 |
| `controls/time-range-control.tsx`        | TimeRangePicker, TimeRangeValue, getBrowserTimezone                    |
| `filters/base/metrics-filter-radio.tsx`  | Label, RadioGroup, RadioGroupItem                                      |
| `filters/base/metrics-filter-search.tsx` | Input, Label, Icon                                                     |
| `filters/base/metrics-filter-select.tsx` | Label                                                                  |
