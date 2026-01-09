# Production Test Guide

A comprehensive testing guide for staging environment validation.

---

## 1. Smoke Tests

Quick validation after deployment (2-3 min). **If any fails → Stop and investigate.**

### 1.1 Health & Auth

| Test         | Steps                                       | Expected                | ✓   |
| ------------ | ------------------------------------------- | ----------------------- | --- |
| API responds | `curl https://staging.example.com/_healthz` | 200 OK                  | ☐   |
| App loads    | Open staging URL in browser                 | Login page renders      | ☐   |
| Login        | Login with test account                     | Redirects to dashboard  | ☐   |
| Logout       | Click logout                                | Redirects to login page | ☐   |

### 1.2 Critical Pages Load

| Test          | Steps                     | Expected                 | ✓   |
| ------------- | ------------------------- | ------------------------ | --- |
| Organizations | Navigate to organizations | List loads without error | ☐   |
| Projects      | Select org, view projects | List loads without error | ☐   |
| DNS Zones     | Navigate to DNS zones     | List loads without error | ☐   |
| Domains       | Navigate to domains       | List loads without error | ☐   |
| Secrets       | Navigate to secrets       | List loads without error | ☐   |

---

## 2. Regression Tests

Full CRUD testing per module. Run after smoke tests pass.

### 2.1 Auth

| Test            | Steps                                | Expected                            | ✓   |
| --------------- | ------------------------------------ | ----------------------------------- | --- |
| Login valid     | Enter valid credentials, submit      | Dashboard loads                     | ☐   |
| Login invalid   | Enter wrong password, submit         | Error message shown                 | ☐   |
| Session persist | Refresh page after login             | Still logged in                     | ☐   |
| Logout          | Click logout button                  | Redirects to login, session cleared | ☐   |
| Protected route | Access dashboard URL when logged out | Redirects to login                  | ☐   |

### 2.2 Organizations

| Test   | Steps                                       | Expected                          | ✓   |
| ------ | ------------------------------------------- | --------------------------------- | --- |
| List   | Navigate to organizations                   | All orgs displayed                | ☐   |
| Create | Click "New Organization", fill form, submit | Org created, appears in list      | ☐   |
| Read   | Click on organization                       | Org details page loads            | ☐   |
| Update | Edit org name, save                         | Name updated in list              | ☐   |
| Delete | Delete test org                             | Org removed from list             | ☐   |
| Switch | Use org switcher in header                  | Context switches, projects update | ☐   |

### 2.3 Projects

| Test   | Steps                                  | Expected                           | ✓   |
| ------ | -------------------------------------- | ---------------------------------- | --- |
| List   | Navigate to projects                   | All projects displayed             | ☐   |
| Create | Click "New Project", fill form, submit | Project created, appears in list   | ☐   |
| Read   | Click on project                       | Project details page loads         | ☐   |
| Update | Edit project name, save                | Name updated in list               | ☐   |
| Delete | Delete test project                    | Project removed from list          | ☐   |
| Switch | Use project switcher in header         | Context switches, resources update | ☐   |

### 2.4 Members & Invitations

| Test          | Steps                               | Expected                            | ✓   |
| ------------- | ----------------------------------- | ----------------------------------- | --- |
| List members  | Navigate to team members            | All members displayed               | ☐   |
| Invite member | Click "Invite", enter email, submit | Invitation sent, appears in pending | ☐   |
| Resend invite | Click resend on pending invitation  | Success message                     | ☐   |
| Cancel invite | Cancel pending invitation           | Invitation removed                  | ☐   |
| Remove member | Remove a test member                | Member removed from list            | ☐   |

### 2.5 DNS Zones & Records

| Test            | Steps                                    | Expected                       | ✓   |
| --------------- | ---------------------------------------- | ------------------------------ | --- |
| List zones      | Navigate to DNS zones                    | All zones displayed            | ☐   |
| Create zone     | Click "New Zone", enter domain, submit   | Zone created, appears in list  | ☐   |
| Read zone       | Click on zone                            | Zone details with records load | ☐   |
| Delete zone     | Delete test zone                         | Zone removed from list         | ☐   |
| **Records**     |                                          |                                |     |
| Create A record | Add A record (test.domain.com → 1.2.3.4) | Record appears in list         | ☐   |
| Create CNAME    | Add CNAME record                         | Record appears in list         | ☐   |
| Update record   | Edit record value                        | Record updates in list         | ☐   |
| Delete record   | Delete test record                       | Record removed from list       | ☐   |
| Real-time       | Create record in another tab             | First tab updates instantly    | ☐   |

### 2.6 Domains

| Test           | Steps                                    | Expected                        | ✓   |
| -------------- | ---------------------------------------- | ------------------------------- | --- |
| List           | Navigate to domains                      | All domains displayed           | ☐   |
| Create         | Click "Add Domain", enter domain, submit | Domain created, appears in list | ☐   |
| Read           | Click on domain                          | Domain details page loads       | ☐   |
| Refresh status | Click refresh on domain                  | Status updates                  | ☐   |
| Delete         | Delete test domain                       | Domain removed from list        | ☐   |
| Real-time      | Update domain in another tab             | First tab updates instantly     | ☐   |

### 2.7 Secrets

| Test             | Steps                                 | Expected                            | ✓   |
| ---------------- | ------------------------------------- | ----------------------------------- | --- |
| List             | Navigate to secrets                   | All secrets displayed               | ☐   |
| Create           | Click "New Secret", fill form, submit | Secret created, appears in list     | ☐   |
| Read             | Click on secret                       | Secret details with key-values load | ☐   |
| Add key-value    | Add new key-value pair                | Pair appears in list                | ☐   |
| Update key-value | Edit existing value                   | Value updates                       | ☐   |
| Delete key-value | Remove a key-value pair               | Pair removed                        | ☐   |
| Delete secret    | Delete test secret                    | Secret removed from list            | ☐   |
| Real-time        | Update secret in another tab          | First tab updates instantly         | ☐   |

### 2.8 HTTP Proxies

| Test      | Steps                                | Expected                       | ✓   |
| --------- | ------------------------------------ | ------------------------------ | --- |
| List      | Navigate to HTTP proxies             | All proxies displayed          | ☐   |
| Create    | Click "New Proxy", fill form, submit | Proxy created, appears in list | ☐   |
| Read      | Click on proxy                       | Proxy details page loads       | ☐   |
| Update    | Edit proxy settings, save            | Settings updated               | ☐   |
| Delete    | Delete test proxy                    | Proxy removed from list        | ☐   |
| Real-time | Update proxy in another tab          | First tab updates instantly    | ☐   |

---

## 3. Test Data Setup

### Prerequisites

- Access to staging environment
- Test user account with admin permissions
- Test organization created

### Test Data Cleanup

After testing, clean up created resources:

| Resource      | Naming Convention    | Action |
| ------------- | -------------------- | ------ |
| Organizations | `test-org-*`         | Delete |
| Projects      | `test-project-*`     | Delete |
| DNS Zones     | `test-*.example.com` | Delete |
| Domains       | `test-*.example.com` | Delete |
| Secrets       | `test-secret-*`      | Delete |
| HTTP Proxies  | `test-proxy-*`       | Delete |

---

## 4. Test Results

| Section               | Pass | Fail | Notes |
| --------------------- | ---- | ---- | ----- |
| Smoke Tests           | /5   |      |       |
| Auth                  | /5   |      |       |
| Organizations         | /6   |      |       |
| Projects              | /6   |      |       |
| Members & Invitations | /5   |      |       |
| DNS Zones & Records   | /10  |      |       |
| Domains               | /6   |      |       |
| Secrets               | /8   |      |       |
| HTTP Proxies          | /6   |      |       |
| **Total**             | /57  |      |       |

**Tested by:** **\*\***\_\_\_\_**\*\***
**Date:** **\*\***\_\_\_\_**\*\***
**Environment:** Staging
**Build/Version:** **\*\***\_\_\_\_**\*\***
