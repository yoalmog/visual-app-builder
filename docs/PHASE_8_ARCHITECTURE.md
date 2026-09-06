# Phase 8 Architecture Documentation: Platform, Collaboration & Production Scale

## 1. Organization & Multi-Tenancy Model
- **Organizations (`Organization`)**: Root tenancy domain encapsulating workspaces, members, roles, usage tracking, and billing.
- **Workspaces (`Workspace`)**: Scoped working environments within an organization (e.g., General, Marketing, Engineering).
- **Memberships & Roles (`Membership`, `OrganizationRole`)**: Roles include `owner`, `admin`, `member`, `viewer`, `billing_admin`. Authorization is validated server-side.
- **Teams & Team Memberships (`Team`, `TeamMembership`)**: Departmental or project groups with `lead` and `member` roles.
- **Project Access Model (`ProjectMembership`, `ProjectRole`)**: Project-level roles (`owner`, `editor`, `commenter`, `reviewer`, `viewer`) take precedence for project-scoped interactions, enforcing least-privilege security.

## 2. Collaboration Architecture & Presence
- **`CollaborationProvider` Interface & `LocalCollaborationProvider`**: Real-time multi-user synchronization layer independent of any single backend service.
- **Presence Tracking**: Live tracking of user connections, active page, active viewport, cursor coordinates, selected node IDs, and editing indicators.
- **Heartbeat & Disconnect**: Automated 30-second TTL heartbeat cleans up stale collaborator presences.

## 3. Operation Protocol & Conflict Detection
- **`ProjectOperation`**: Persistent operations (`add_node`, `remove_node`, `move_node`, `update_props`, `update_styles`, `add_page`, `delete_page`, `rename_page`, `update_theme`, `update_token`, `update_settings`).
- **Base Version Conflict Engine**: Every operation carries `baseVersion`. The server validates `baseVersion === currentProjectVersion`. If version mismatch occurs, operation is rejected with `VERSION_CONFLICT` and latest server snapshot is provided.
- **Atomic Transactions & Collaborative Undo**: Reversible user transactions are bounded and tracked per-actor. Undo operations verify that subsequent collaborators have not modified the target node.

## 4. Version Control System (VCS)
- **Entities**: Branches, Commits, Snapshots, Reviews, and Releases.
- **Branches & Protection**: `main` and `production` branches enforce review requirements, minimum approvals, and prevent direct push mutations.
- **Snapshots**: Immutable project snapshots stored alongside every commit.
- **Semantic Diff Engine**: Computes structured entity diffs (pages, nodes, props, styles, tokens, themes, workflows, queries) and categorizes them into `added`, `removed`, `modified`, or `conflicted`.
- **Merge Engine**: Reconciles divergence between branches, validates conflict-free mergeability, and generates atomic merge commits.

## 5. Deployment Lifecycle & Build Queue
- **7-Stage Pipeline**:
  1. `VALIDATION`: Project schema and page integrity verification.
  2. `BUILD`: AST compilation and token/workflow bundling.
  3. `TEST`: Automated node integrity and root container validation.
  4. `PACKAGE`: Immutable release bundle compilation.
  5. `DEPLOY`: Distribution to environment (Development, Preview, Production).
  6. `HEALTH CHECK`: Runtime probe and latency verification.
  7. `RELEASE`: Immutable release registration linked to commit and snapshot.
- **Job Queue (`JobQueueProvider`)**: Priority-based background queue supporting retries with exponential backoff.
- **Preview Deployments**: Isolated branch deployments with unique URLs (`*.preview.apexstudio.io`) and TTL expirations.
- **Rollback Engine**: Immediate restoration to historical release snapshots without state reconstruction.

## 6. Plugin & Marketplace Security
- **Untrusted Plugin Sandboxing**: Strict whitelist proxy pattern. Plugins do not receive raw execution handles or runtime scope.
- **Manifest Permissions**: Required capabilities (`read_project`, `write_project`, `read_data`, `write_data`, `read_runtime`, `network`, `storage`, `notifications`) must be explicitly declared and granted.
- **Zero Dynamic Code Execution**: Zero `eval()`, zero `new Function()`, zero dynamic script loading.

## 7. Enterprise Security, API Keys & Audit Logging
- **API Key Management (`ApiKeyManager`)**: SHA-256 hashed secret storage with prefixing (`apk_...`) and explicit permission scopes.
- **Service Accounts (`ServiceAccountManager`)**: Non-human identities scoped for automated CI/CD and integrations.
- **Immutable Audit Log (`AuditLogger`)**: Tamper-resistant log with automatic recursive redaction of sensitive credentials, keys, and tokens.
- **Rate Limiting (`RateLimiter`)**: Sliding window request throttle safeguarding critical endpoints.

## 8. Usage Metering & Billing Abstraction
- **Usage Provider (`UsageProvider`)**: Server-authoritative aggregation across metrics (AI requests, AI tokens, storage, API requests, workflows, deployments, collaborators).
- **Entitlements (`EntitlementProvider`)**: Centralized plan boundaries (`Free`, `Pro`, `Team`, `Business`, `Enterprise`) preventing scattered UI checks.
- **Billing Provider (`BillingProvider`)**: Provider-agnostic subscription abstraction compatible with Stripe webhooks and customer portals.
