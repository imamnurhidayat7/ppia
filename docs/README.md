# PPIA Auckland — Documentation

This folder documents the PPIA Auckland platform: how it is built, how to run it,
and how the parts work together.

## Contents

| Document | What it covers |
| --- | --- |
| [Getting started](getting-started.md) | Prerequisites, local setup, seeding a first admin |
| [Architecture](architecture.md) | Monorepo layout, request flow, auth model, key libraries |
| [Configuration](configuration.md) | Every environment variable for the API and web app |
| [Data model](data-model.md) | Prisma models, enums, roles, and the membership lifecycle |
| [API reference](api-reference.md) | REST endpoints grouped by resource, with auth requirements |
| [Frontend guide](frontend.md) | Dashboard shell, role-based navigation, design system, dark mode, i18n |
| [Deployment](deployment.md) | Production build, environment, and hardening checklist |

## The platform in one paragraph

A Next.js 16 frontend (`web/`) talks to an Express + Prisma backend (`api/`) over a
JSON REST API. PostgreSQL is the database. Visitors see a public marketing site with
CMS-managed content and a bilingual (English/Indonesian) toggle. Members sign in to a
dashboard to browse content, register for events, and vote in the student election
(PEMIRA). Admins use a role-gated dashboard to manage everything. Authentication is a
custom JWT flow; there is no third-party identity provider.

## Roles at a glance

| Role | Can do |
| --- | --- |
| `MEMBER` | Sign in, browse content, register for events, edit own profile, vote in PEMIRA |
| `BOARD` | Everything a member can, **plus** manage website content: articles, events, research, comments, media, tags, pages, and the homepage |
| `SUPER_ADMIN` | Everything, **plus** members, divisions, event registrations, newsletters, elections, audit logs, search console, and site settings |

The role split is enforced on the server (route middleware and controller checks) and
mirrored in the frontend navigation. See [Data model](data-model.md#roles) and
[Frontend guide](frontend.md#roles-and-navigation).
