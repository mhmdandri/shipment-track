# REFACTOR.md - Safe Refactoring Guidelines

> This document defines the mandatory rules for refactoring the project.
>
> Every AI Agent MUST read this document before making any code changes.
>
> These rules are mandatory.
>
> Stability is always more important than code beauty.

---

# Primary Goal

Improve:

- Readability
- Maintainability
- Scalability
- Performance
- Type Safety
- Code Reusability

WITHOUT changing existing behavior.

---

# Golden Rules

NEVER

❌ Change business logic.

❌ Change API response.

❌ Change API endpoint.

❌ Change database schema unless explicitly requested.

❌ Rename exported functions.

❌ Rename public types.

❌ Rename routes.

❌ Rename environment variables.

❌ Remove features.

❌ Remove validations.

❌ Remove logging.

❌ Remove monitoring.

❌ Remove notification flow.

❌ Change authentication flow.

❌ Change cron behavior.

❌ Change webhook behavior.

❌ Change WhatsApp commands.

❌ Change Telegram notification flow.

---

# Production Safety

Treat this project as a production SaaS.

Every change must preserve:

- Existing users
- Existing API
- Existing Database
- Existing Cron Jobs
- Existing Monitoring
- Existing Notifications
- Existing Authentication
- Existing Tracking Logic

Never optimize by sacrificing stability.

---

# Refactor Workflow

For every refactor:

## Phase 1

Read

- AGENT.md
- SKILLS.md

Understand:

- Architecture
- Business Flow
- Module Responsibility

Never skip this phase.

---

## Phase 2

Analyze

Identify:

- duplicated code
- dead code
- large functions
- large components
- unnecessary complexity
- type problems
- poor naming
- repeated queries
- repeated validations

Do not modify code yet.

---

## Phase 3

Impact Analysis

Before touching code determine:

Which modules use it?

Who imports it?

Who calls it?

Can it break API?

Can it break UI?

Can it break database?

Can it break cron?

Can it break webhook?

Can it break WAHA?

Can it break Telegram?

Can it break tracking?

Can it break monitoring?

If yes,

STOP

Explain the impact first.

---

## Phase 4

Implementation

Refactor only the selected module.

Never refactor unrelated files.

Prefer many small improvements over one huge rewrite.

---

## Phase 5

Verification

Verify:

✅ TypeScript

✅ Build

✅ Runtime

✅ Existing features

✅ Existing API

✅ Existing UI

✅ Existing database

✅ Existing cron

✅ Existing notifications

✅ Existing monitoring

Only continue when everything still works.

---

# Allowed Refactoring

✅ Extract helper functions

✅ Extract constants

✅ Extract utilities

✅ Improve naming (private only)

✅ Improve folder structure (small scope)

✅ Improve error handling

✅ Improve TypeScript types

✅ Remove duplicate code

✅ Split very large files

✅ Split very large functions

✅ Improve comments

✅ Improve documentation

✅ Improve validation

✅ Improve logging

---

# Forbidden Refactoring

❌ Rewrite architecture

❌ Rewrite modules

❌ Rewrite database

❌ Rewrite authentication

❌ Rewrite monitoring

❌ Rewrite notification engine

❌ Rewrite tracking engine

❌ Massive rename

❌ Massive move

❌ Massive formatting only commits

❌ Refactor entire repository at once

---

# Refactor Priority

Priority 1

Critical Bugs

Priority 2

Duplicate Code

Priority 3

Dead Code

Priority 4

Large Functions

Priority 5

Large Components

Priority 6

Error Handling

Priority 7

Validation

Priority 8

Type Safety

Priority 9

Performance

Priority 10

Documentation

---

# Module Refactor Order

Only refactor one module at a time.

Example:

1.

Shipment

↓

2.

Dashboard

↓

3.

Tracker

↓

4.

Terminal Tracker

↓

5.

Monitoring

↓

6.

Notifications

↓

7.

WhatsApp

↓

8.

Cron

↓

9.

Authentication

↓

10.

Subscriptions

Never refactor multiple major modules in one task.

---

# Performance Rules

Before optimizing:

Measure.

Never guess.

Only optimize when there is measurable benefit.

Do not introduce unnecessary abstraction.

KISS over Cleverness.

---

# Code Quality Principles

Always follow:

SOLID

DRY

KISS

YAGNI

Composition over inheritance

Pure functions whenever possible

Single Responsibility Principle

---

# Database Rules

Never

- use prisma db push

Always

- prisma migrate dev

Never remove indexes without reason.

Never modify relations unless requested.

Never rename models.

Never rename enums.

---

# API Rules

Never change

HTTP Method

Request Body

Response Body

Status Code

Error Format

unless explicitly requested.

---

# UI Rules

Never change

User workflow

User experience

Navigation

Keyboard shortcuts

Loading behavior

Success messages

Error messages

unless explicitly requested.

---

# Logging Rules

Never remove logs that help debugging.

Improve logs instead.

Use contextual logging.

Always preserve stack traces.

---

# Documentation Rules

If code behavior changes,

update:

AGENT.md

SKILLS.md

README.md

if necessary.

Documentation must stay synchronized with implementation.

---

# Commit Strategy

One logical refactor

=

One commit

Avoid giant commits.

---

# Required Output

Every completed refactor must include:

## Objective

## Problems Found

## Root Cause

## Solution

## Files Modified

## Risk Level

Low

Medium

High

## Regression Check

- Build

- Type Check

- Runtime

- Existing Features

- API

- Database

- Notifications

- Cron

- Tracking

- Monitoring

## Next Recommended Refactor

---

# Final Rule

When unsure,

DO NOT MODIFY.

Explain the risk first.

Safe refactoring is always better than aggressive refactoring.
