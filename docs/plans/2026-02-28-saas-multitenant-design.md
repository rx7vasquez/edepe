# Design: Edepe SaaS Multi-Tenant Architecture

**Date:** 2026-02-28
**Topic:** Transition from single-tenant LocalStorage architecture to a secure, multi-tenant SaaS model.

## 1. Overview
Edepe will transition to a fully functional Software-as-a-Service (SaaS) model. The core requirement is robust tenant isolation: data belonging to Company A must never be accessible by Company B. To achieve this, all persistent storage will move from the frontend (`LocalStorage`) to a secure Node.js backend backed by PostgreSQL.

## 2. Architecture Principles
- **Strict Tenancy (1:1):** A user account belongs to exactly one company (`company_id`).
- **Backend Source of Truth:** The frontend becomes a dumb client. All data fetching, saving, and validation logic moves to the Node.js API.
- **Stateless Authentication:** JSON Web Tokens (JWT) will be used. The token will encode the user's `company_id` and `role`, ensuring that API requests are scoped strictly to their company.

## 3. Role Hierarchy (3-Tier Model)
The system will operate with three distinct administrative levels:
1. **SysAdmin (Global):** The platform owner (Edepe administrators). Has access to a hidden global dashboard to manage subscriptions, activate companies, and monitor overall system health.
2. **Admin Cliente (Company Level):** The owner/manager of the construction company. Can create projects, manage corporate settings, and invite/create new users (e.g., project managers, field engineers) within their company.
3. **Usuario Normal (Project Level):** Everyday users who can only view and interact with projects explicitly assigned to them by the Admin Cliente.

## 4. Onboarding Flow (Mixed Workflow)
To balance growth and security/quality control:
- **Self-Service Registration:** Companies can visit the website and register an account.
- **Pending Validation:** New accounts are created in a "Pending" state. They can access the system but with limitations (or just a welcome screen).
- **Manual Activation:** The SysAdmin reviews the registration and activates the company, allowing full operational usage.

## 5. Database Schema (PostgreSQL)
A major migration to PostgreSQL will occur. Key entities and relationships:

*   **`companies`**: `id`, `name`, `rut`, `status` (active/pending), `created_at`.
*   **`users`**: `id`, `company_id` (FK), `email`, `password_hash`, `role`, `is_active`.
*   **`projects`**: `id`, `company_id` (FK), `name`, `code`, `config_data`.
*   **`clients`** (Mandantes): `id`, `company_id` (FK), `name`, `rut`.
*   **`advances`** / **`edp`**: Will inherit the tenancy via relation to `projects`.
*   **Global Tables** (`polinomio_indices`, `ipc_indices`): Remain global (no `company_id`), readable by all active companies.

*(Note: Every API endpoint interacting with tenant-specific tables must automatically append `WHERE company_id = ?` based on the JWT payload).*

## 6. Implementation Strategy
Due to the profound nature of this refactor, it will be executed in phases (Full Migration - Approach 1):
1.  **Backend Foundations:** Setup PostgreSQL, Prisma/Objection (ORM), and JWT Auth scaffolding.
2.  **API Construction:** Create RESTful endpoints for all current operations (Users, Projects, Clients, Advances) forcing `company_id` checks.
3.  **Frontend Rewiring:** Replace `StorageService` calls with `fetch` calls to the new APIs. Implement JWT storage (HttpOnly cookies or secure local context).
4.  **Admin Panels:** Build the SysAdmin interface and the Company Admin management screens.
