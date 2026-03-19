# AURA — Personal AI Super App
## Complete Architecture & Feature Blueprint

---

## 1. TECH STACK

### Frontend (Mobile)
| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **React Native (Expo)** | Single codebase for Android + iOS, huge ecosystem |
| Navigation | React Navigation v7 | Native feel, deep linking support |
| State Management | Zustand + React Query (TanStack) | Lightweight global state + server state caching |
| UI Library | Custom Design System + React Native Reanimated 3 | 60fps animations, glassmorphism, fluid transitions |
| Charts/Viz | Victory Native / react-native-skia | High-performance health/sports data visualization |
| Voice | react-native-voice + Whisper API | On-device speech-to-text + cloud fallback |
| Local Storage | WatermelonDB (SQLite) | Offline-first, syncs with backend |
| Push Notifications | Firebase Cloud Messaging (FCM) + APNs | Cross-platform push |

### Backend
| Layer | Technology | Why |
|-------|-----------|-----|
| API Framework | **Node.js + Fastify** | 2x faster than Express, TypeScript native |
| API Protocol | REST + WebSocket (Socket.io) | REST for CRUD, WebSocket for real-time chat/notifications |
| Auth | **Supabase Auth** or Firebase Auth | Social login, email/pass, phone OTP, JWT |
| File Storage | AWS S3 / Cloudflare R2 | Profile pics, voice recordings, documents |
| Background Jobs | BullMQ (Redis) | Scheduled reminders, AI analysis jobs, notifications |
| AI Gateway | Custom AI Router Service | Routes to Claude/GPT/Whisper APIs, manages tokens |
| Search | Meilisearch or Typesense | Full-text search across all modules |
| Caching | Redis | Session cache, rate limiting, real-time data |

### Database
| Type | Technology | Purpose |
|------|-----------|---------|
| Primary DB | **PostgreSQL** | All structured data (users, tracking, modules) |
| Vector DB | **Pgvector** (PostgreSQL extension) | AI memory embeddings for personalized responses |
| Time-Series | **TimescaleDB** (PostgreSQL extension) | Health metrics, habit streaks, analytics |
| Cache/Queue | **Redis** | Sessions, job queues, real-time presence |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Hosting | AWS (ECS/Fargate) or Railway/Render for MVP |
| CDN | CloudFront or Cloudflare |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (errors) + Grafana/Prometheus (metrics) |
| API Docs | Swagger/OpenAPI |

---

## 2. DATABASE SCHEMA DESIGN

### Core Tables

```
┌─────────────────────────────────────────────────────┐
│                    USERS                             │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ email (unique)                                      │
│ phone (unique, nullable)                            │
│ password_hash                                       │
│ full_name                                           │
│ avatar_url                                          │
│ date_of_birth                                       │
│ gender                                              │
│ timezone                                            │
│ locale (language preference)                        │
│ subscription_tier (free | pro | family)              │
│ subscription_expires_at                             │
│ onboarding_completed (boolean)                      │
│ created_at / updated_at                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                USER_PREFERENCES                      │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users)                                │
│ theme (light | dark | auto)                         │
│ accent_color                                        │
│ dashboard_layout (JSON — bento grid config)         │
│ active_modules (JSON array)                         │
│ notification_settings (JSON)                        │
│ voice_assistant_enabled (boolean)                   │
│ voice_id (preferred voice)                          │
│ units (metric | imperial)                           │
└─────────────────────────────────────────────────────┘
```

### AI Memory System (Critical for Personalization)

```
┌─────────────────────────────────────────────────────┐
│              AI_CONVERSATIONS                        │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ title                                               │
│ started_at / ended_at                               │
│ module_context (which module was active)             │
│ summary (AI-generated conversation summary)          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              AI_MESSAGES                             │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ conversation_id (FK → ai_conversations)             │
│ role (user | assistant | system)                    │
│ content (text)                                      │
│ tokens_used                                         │
│ model_used                                          │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│           AI_MEMORY_EMBEDDINGS                       │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ content (text — the fact/preference/insight)         │
│ embedding (vector(1536) — pgvector)                 │
│ source_type (conversation | module_data | user_input)│
│ source_id (FK to source record)                     │
│ category (preference | health_insight | habit_pattern│
│           | professional_note | personal_fact)       │
│ importance_score (0.0 - 1.0)                        │
│ last_accessed_at                                    │
│ expires_at (nullable — for temporary context)        │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              AI_USER_PROFILE                         │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users, PK)                            │
│ personality_summary (text)                          │
│ communication_style (formal | casual | mixed)       │
│ goals_summary (text)                                │
│ known_preferences (JSONB)                           │
│ health_context (JSONB)                              │
│ professional_context (JSONB)                        │
│ updated_at                                          │
└─────────────────────────────────────────────────────┘
```

### Module: Health & Fitness

```
┌─────────────────────────────────────────────────────┐
│              HEALTH_PROFILES                         │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users, PK)                            │
│ height_cm                                           │
│ weight_kg                                           │
│ blood_type                                          │
│ allergies (JSONB)                                   │
│ medical_conditions (JSONB)                          │
│ fitness_level (beginner | intermediate | advanced)   │
│ daily_calorie_goal                                  │
│ daily_water_goal_ml                                 │
│ daily_steps_goal                                    │
│ sleep_goal_hours                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              HEALTH_LOGS (TimescaleDB)               │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ metric_type (weight | blood_pressure | heart_rate |  │
│              blood_sugar | temperature | spo2 |      │
│              steps | water_intake | sleep)            │
│ value (NUMERIC)                                     │
│ unit                                                │
│ metadata (JSONB — e.g., systolic/diastolic for BP)  │
│ source (manual | wearable | import)                 │
│ logged_at (TIMESTAMPTZ)                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              WORKOUTS                                │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ workout_type (cardio | strength | flexibility |      │
│               sports | yoga | swimming | custom)     │
│ title                                               │
│ duration_minutes                                    │
│ calories_burned                                     │
│ intensity (low | medium | high)                     │
│ exercises (JSONB — array of exercise details)        │
│ notes                                               │
│ heart_rate_avg / heart_rate_max                     │
│ completed_at                                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              SLEEP_LOGS                              │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ sleep_start / sleep_end                             │
│ duration_minutes                                    │
│ quality_score (1-10)                                │
│ deep_sleep_minutes                                  │
│ rem_sleep_minutes                                   │
│ light_sleep_minutes                                 │
│ awake_minutes                                       │
│ source (manual | wearable)                          │
│ notes                                               │
└─────────────────────────────────────────────────────┘
```

### Module: Meal & Nutrition

```
┌─────────────────────────────────────────────────────┐
│              MEAL_PLANS                              │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name (e.g., "Keto Week 3")                          │
│ diet_type (keto | vegan | paleo | balanced | custom) │
│ daily_calorie_target                                │
│ macro_targets (JSONB — protein/carb/fat grams)      │
│ start_date / end_date                               │
│ is_active (boolean)                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              MEAL_LOGS                               │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ meal_plan_id (FK, nullable)                         │
│ meal_type (breakfast | lunch | dinner | snack)       │
│ food_items (JSONB — name, qty, calories, macros)     │
│ total_calories                                      │
│ total_protein / total_carbs / total_fat             │
│ photo_url (nullable)                                │
│ ai_detected_foods (JSONB — from photo analysis)      │
│ logged_at                                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              WATER_LOGS                              │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users)                                │
│ amount_ml                                           │
│ logged_at                                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              FOOD_DATABASE                           │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ name                                                │
│ brand (nullable)                                    │
│ serving_size / serving_unit                         │
│ calories / protein / carbs / fat / fiber            │
│ barcode (nullable)                                  │
│ is_verified (boolean)                               │
│ created_by (system | user_id)                       │
└─────────────────────────────────────────────────────┘
```

### Module: Habits

```
┌─────────────────────────────────────────────────────┐
│              HABITS                                  │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name                                                │
│ description                                         │
│ icon / color                                        │
│ frequency (daily | weekly | custom)                  │
│ frequency_config (JSONB — e.g., Mon/Wed/Fri)        │
│ target_count (e.g., 3 times per day)                │
│ reminder_times (JSONB array)                        │
│ category (health | productivity | learning |         │
│           mindfulness | fitness | custom)             │
│ is_active (boolean)                                 │
│ streak_current / streak_best                        │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              HABIT_COMPLETIONS                        │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ habit_id (FK → habits)                              │
│ user_id (FK → users)                                │
│ completed_at                                        │
│ value (nullable — for measurable habits)            │
│ note (nullable)                                     │
└─────────────────────────────────────────────────────┘
```

### Module: Professional & Productivity

```
┌─────────────────────────────────────────────────────┐
│              TASKS                                   │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ project_id (FK, nullable)                           │
│ title                                               │
│ description                                         │
│ priority (urgent | high | medium | low)              │
│ status (todo | in_progress | done | archived)        │
│ due_date                                            │
│ due_time (nullable)                                 │
│ tags (JSONB array)                                  │
│ estimated_minutes                                   │
│ actual_minutes                                      │
│ recurrence (JSONB — daily/weekly/monthly config)     │
│ parent_task_id (FK, nullable — for subtasks)         │
│ sort_order                                          │
│ completed_at (nullable)                             │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              PROJECTS                                │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name                                                │
│ description                                         │
│ color / icon                                        │
│ status (active | completed | archived)               │
│ deadline                                            │
│ progress_percent                                    │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              CALENDAR_EVENTS                         │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ title                                               │
│ description                                         │
│ location                                            │
│ start_time / end_time                               │
│ is_all_day (boolean)                                │
│ recurrence_rule (RRULE string)                      │
│ reminder_minutes_before (JSONB array)               │
│ color                                               │
│ external_calendar_id (Google/Outlook sync)           │
│ linked_task_id (FK, nullable)                       │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              TIME_TRACKING                           │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ task_id (FK, nullable)                              │
│ project_id (FK, nullable)                           │
│ category (work | study | personal | break)           │
│ started_at / ended_at                               │
│ duration_minutes                                    │
│ notes                                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              NOTES                                   │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ title                                               │
│ content (rich text / markdown)                      │
│ folder_id (FK, nullable)                            │
│ tags (JSONB array)                                  │
│ is_pinned / is_archived                             │
│ linked_module (nullable — e.g., "health", "project") │
│ linked_record_id (nullable)                         │
│ created_at / updated_at                             │
└─────────────────────────────────────────────────────┘
```

### Module: Education & Learning

```
┌─────────────────────────────────────────────────────┐
│              LEARNING_GOALS                          │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ title (e.g., "Learn Spanish B2")                    │
│ category (language | programming | instrument |      │
│           academic | certification | skill)           │
│ target_date                                         │
│ progress_percent                                    │
│ daily_time_goal_minutes                             │
│ status (active | completed | paused)                 │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              LEARNING_SESSIONS                       │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ goal_id (FK → learning_goals)                       │
│ user_id (FK → users)                                │
│ duration_minutes                                    │
│ topic / notes                                       │
│ resources_used (JSONB)                              │
│ satisfaction_score (1-5)                            │
│ completed_at                                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              FLASHCARDS                              │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ deck_id (FK → flashcard_decks)                      │
│ front (text)                                        │
│ back (text)                                         │
│ difficulty (easy | medium | hard)                    │
│ next_review_at (spaced repetition)                  │
│ review_count                                        │
│ ease_factor (SM-2 algorithm)                        │
│ created_at                                          │
└─────────────────────────────────────────────────────┘
```

### Module: Finance (Personal)

```
┌─────────────────────────────────────────────────────┐
│              FINANCIAL_ACCOUNTS                      │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name (e.g., "Main Checking")                        │
│ type (checking | savings | credit | cash | investment)│
│ currency                                            │
│ balance                                             │
│ icon / color                                        │
│ is_active                                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              TRANSACTIONS                            │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ account_id (FK → financial_accounts)                │
│ type (income | expense | transfer)                   │
│ amount                                              │
│ currency                                            │
│ category (food | transport | rent | salary |         │
│           entertainment | health | education | other) │
│ description                                         │
│ is_recurring (boolean)                              │
│ recurrence_rule                                     │
│ receipt_url (nullable)                              │
│ transaction_date                                    │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              BUDGETS                                 │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ category                                            │
│ amount_limit                                        │
│ period (weekly | monthly | yearly)                   │
│ spent_amount (computed)                             │
│ alert_threshold_percent (e.g., 80%)                 │
│ month / year                                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              SAVINGS_GOALS                           │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name (e.g., "Emergency Fund")                       │
│ target_amount / current_amount                      │
│ target_date                                         │
│ auto_save_amount / auto_save_frequency              │
│ status (active | reached | paused)                   │
└─────────────────────────────────────────────────────┘
```

### Module: Sports & Activities

```
┌─────────────────────────────────────────────────────┐
│              SPORTS_PROFILES                         │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users, PK)                            │
│ primary_sports (JSONB array)                        │
│ skill_levels (JSONB — sport → level mapping)        │
│ preferred_workout_times (JSONB)                     │
│ injuries (JSONB — current and past)                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              SPORTS_ACTIVITIES                       │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ sport_type (running | cycling | swimming | football |│
│             basketball | tennis | gym | yoga | etc.)  │
│ distance_km (nullable)                              │
│ duration_minutes                                    │
│ calories_burned                                     │
│ avg_speed / max_speed (nullable)                    │
│ route_data (JSONB — GPS coordinates for mapping)     │
│ weather_conditions (JSONB)                          │
│ performance_notes                                   │
│ personal_best (boolean)                             │
│ completed_at                                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              TRAINING_PLANS                          │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name                                                │
│ sport_type                                          │
│ goal (e.g., "Run 5K in under 25 min")              │
│ weeks_duration                                      │
│ schedule (JSONB — weekly plan)                       │
│ ai_generated (boolean)                              │
│ status (active | completed | abandoned)              │
│ started_at                                          │
└─────────────────────────────────────────────────────┘
```

### Module: Mental Wellness

```
┌─────────────────────────────────────────────────────┐
│              MOOD_LOGS                               │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ mood_score (1-10)                                   │
│ emotions (JSONB array — happy, anxious, calm, etc.)  │
│ energy_level (1-5)                                  │
│ stress_level (1-5)                                  │
│ triggers (JSONB array)                              │
│ journal_entry (text, nullable)                      │
│ logged_at                                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              MEDITATION_SESSIONS                     │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ type (guided | unguided | breathing | body_scan)     │
│ duration_minutes                                    │
│ mood_before / mood_after (1-10)                     │
│ completed_at                                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              JOURNAL_ENTRIES                          │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ title                                               │
│ content (rich text)                                 │
│ mood_score                                          │
│ gratitude_items (JSONB array)                       │
│ tags (JSONB array)                                  │
│ is_private (boolean — extra encryption)             │
│ ai_insights (text, nullable — Pro feature)          │
│ created_at                                          │
└─────────────────────────────────────────────────────┘
```

### Module: Social & Family

```
┌─────────────────────────────────────────────────────┐
│              CONTACTS                                │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ name                                                │
│ relationship (family | friend | colleague | other)   │
│ birthday                                            │
│ important_dates (JSONB)                             │
│ notes                                               │
│ last_contacted_at                                   │
│ contact_frequency_goal (weekly | monthly | quarterly)│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              FAMILY_MEMBERS (Pro)                     │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ owner_user_id (FK → users)                          │
│ linked_user_id (FK → users, nullable)               │
│ name                                                │
│ role (spouse | child | parent | sibling)             │
│ shared_modules (JSONB — which modules are shared)    │
└─────────────────────────────────────────────────────┘
```

### Subscription & Billing

```
┌─────────────────────────────────────────────────────┐
│              SUBSCRIPTIONS                           │
├─────────────────────────────────────────────────────┤
│ id (UUID, PK)                                       │
│ user_id (FK → users)                                │
│ plan (free | pro_monthly | pro_yearly | family)      │
│ status (active | cancelled | expired | trial)        │
│ payment_provider (stripe | google_play | app_store)  │
│ provider_subscription_id                            │
│ current_period_start / current_period_end           │
│ trial_ends_at                                       │
│ cancelled_at                                        │
│ created_at                                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              FEATURE_FLAGS                           │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ feature_key (e.g., "ai_chatbot", "cross_analysis")  │
│ required_tier (free | pro | family)                  │
│ is_enabled (boolean — for gradual rollout)          │
│ rollout_percent (0-100)                             │
└─────────────────────────────────────────────────────┘
```

### Gamification

```
┌─────────────────────────────────────────────────────┐
│              ACHIEVEMENTS                            │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ name                                                │
│ description                                         │
│ icon_url                                            │
│ category (health | habits | learning | social | etc.)│
│ criteria (JSONB — rules to unlock)                   │
│ xp_reward                                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              USER_ACHIEVEMENTS                       │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users)                                │
│ achievement_id (FK → achievements)                  │
│ unlocked_at                                         │
│ progress_percent                                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              USER_XP                                 │
├─────────────────────────────────────────────────────┤
│ user_id (FK → users, PK)                            │
│ total_xp                                            │
│ level                                               │
│ xp_to_next_level                                    │
│ weekly_xp (JSONB — for leaderboard)                 │
└─────────────────────────────────────────────────────┘
```

---

## 3. COMPLETE FEATURE LIST

### FREE TIER FEATURES

#### Dashboard & Core
- [ ] Customizable Bento Box dashboard (drag & drop widgets)
- [ ] Dark/Light/Auto theme
- [ ] Accent color customization
- [ ] Module enable/disable (show only what you use)
- [ ] Daily summary card
- [ ] Quick-add floating action button
- [ ] Global search across all modules
- [ ] Offline mode (local-first with sync)

#### Health Tracking (Basic)
- [ ] Weight logging & trend chart
- [ ] Water intake tracker (glass counter)
- [ ] Step counter (device pedometer integration)
- [ ] Basic sleep logging (manual)
- [ ] Heart rate logging (manual or wearable)
- [ ] Blood pressure logging
- [ ] BMI calculator
- [ ] Health dashboard with weekly/monthly views
- [ ] Export health data as CSV/PDF

#### Meal & Nutrition (Basic)
- [ ] Meal logging (breakfast/lunch/dinner/snack)
- [ ] Calorie counter
- [ ] Basic macro tracking (protein/carbs/fat)
- [ ] Water intake integration
- [ ] Food search from database
- [ ] Barcode scanner for packaged food
- [ ] Daily/weekly nutrition summary
- [ ] Basic meal reminders

#### Habit Tracker
- [ ] Create unlimited habits
- [ ] Daily/weekly/custom frequency
- [ ] Streak tracking with visual calendar
- [ ] Habit categories with icons
- [ ] Reminder notifications
- [ ] Weekly completion rate
- [ ] Habit archive

#### Task & To-Do (Basic)
- [ ] Task creation with priority levels
- [ ] Due dates & reminders
- [ ] Subtasks / checklists
- [ ] Project grouping
- [ ] Tags & filtering
- [ ] Calendar view of tasks
- [ ] Recurring tasks

#### Notes (Basic)
- [ ] Create & organize notes
- [ ] Folder structure
- [ ] Tags
- [ ] Search within notes
- [ ] Basic formatting (bold, italic, lists)
- [ ] Pin important notes

#### Sports & Fitness (Basic)
- [ ] Log workouts (type, duration, calories)
- [ ] 15+ sport types supported
- [ ] Workout history & stats
- [ ] Personal best tracking
- [ ] Basic exercise library

#### Education (Basic)
- [ ] Learning goal setting
- [ ] Study session timer (Pomodoro)
- [ ] Basic flashcards (manual creation)
- [ ] Learning streak tracking
- [ ] Progress tracking

#### Mental Wellness (Basic)
- [ ] Mood logging (1-10 scale + emotions)
- [ ] Basic journal entries
- [ ] Gratitude list
- [ ] Stress level tracking
- [ ] Weekly mood trends

#### Finance (Basic)
- [ ] Manual transaction logging
- [ ] Income & expense categories
- [ ] Monthly budget setting
- [ ] Basic spending charts
- [ ] Multiple accounts

#### Social
- [ ] Contact list with birthdays
- [ ] Birthday reminders
- [ ] Relationship notes
- [ ] Contact frequency goals

#### Gamification
- [ ] XP system for completing activities
- [ ] Levels (1-100)
- [ ] Achievement badges
- [ ] Daily challenges
- [ ] Weekly streaks bonus

---

### PRO TIER FEATURES ($9.99/mo or $79.99/yr)

#### AI Chatbot — "Aura"
- [ ] Conversational AI assistant (Claude API)
- [ ] Context-aware (knows your data across all modules)
- [ ] Natural language task creation ("remind me to...")
- [ ] Natural language queries ("how was my sleep this week?")
- [ ] Conversation history & memory
- [ ] Personality customization (formal/casual/motivational)
- [ ] Multi-language support

#### Voice Assistant
- [ ] "Hey Aura" wake word (on-device)
- [ ] Voice-to-action ("Log 2 glasses of water")
- [ ] Voice journaling (speech-to-text → journal entry)
- [ ] Voice notes
- [ ] Read-aloud daily summary
- [ ] Voice-controlled navigation
- [ ] Multiple voice options (TTS)

#### AI Cross-Module Analysis (The Killer Feature)
- [ ] Sleep ↔ Productivity correlation
- [ ] Meal ↔ Energy level analysis
- [ ] Exercise ↔ Mood correlation
- [ ] Habit consistency ↔ Goal progress
- [ ] Spending ↔ Mood patterns
- [ ] Weekly AI-generated insights report
- [ ] "Why am I feeling X?" root cause analysis
- [ ] Predictive suggestions ("You usually feel tired on Tuesdays...")

#### Advanced Health
- [ ] Wearable device sync (Apple Health, Google Fit, Fitbit, Garmin)
- [ ] Automatic workout detection
- [ ] Advanced sleep analytics (stages, quality score)
- [ ] Health trend predictions
- [ ] Medication reminders & tracking
- [ ] Symptom tracker
- [ ] Doctor visit log
- [ ] Health report generation (PDF for doctor)

#### Advanced Nutrition
- [ ] AI meal photo recognition (snap → log)
- [ ] AI-generated meal plans based on goals
- [ ] Recipe suggestions based on dietary preferences
- [ ] Grocery list generation from meal plan
- [ ] Micronutrient tracking (vitamins, minerals)
- [ ] Restaurant menu scanner
- [ ] Intermittent fasting tracker

#### Advanced Productivity
- [ ] AI task prioritization (Eisenhower matrix auto-sort)
- [ ] Smart scheduling (auto-fill calendar gaps)
- [ ] Focus mode with app blocking suggestions
- [ ] Email digest & prioritization
- [ ] Meeting prep notes (AI-generated)
- [ ] Project timeline & Gantt view
- [ ] Time tracking analytics
- [ ] Productivity score

#### Advanced Education
- [ ] AI-generated flashcards from notes/photos
- [ ] Spaced repetition algorithm (SM-2)
- [ ] AI tutor for any subject
- [ ] Study plan generation
- [ ] Quiz generation from material
- [ ] Progress analytics & predictions
- [ ] Course/resource recommendations

#### Advanced Finance
- [ ] Bank account sync (Plaid integration)
- [ ] Auto-categorization of transactions (AI)
- [ ] Spending insights & anomaly detection
- [ ] Savings goal automation
- [ ] Bill reminders
- [ ] Financial health score
- [ ] Investment tracking basics
- [ ] Tax-deductible expense tagging

#### Advanced Mental Wellness
- [ ] AI journal prompts (personalized)
- [ ] Mood pattern analysis with triggers
- [ ] Guided meditation library
- [ ] Breathing exercises
- [ ] CBT-based thought logging
- [ ] Therapist session notes
- [ ] Crisis resource links

#### Advanced Sports
- [ ] AI-generated training plans
- [ ] GPS route tracking & mapping
- [ ] Performance analytics & predictions
- [ ] Recovery score
- [ ] Injury prevention tips (AI)
- [ ] Sport-specific metrics
- [ ] Competition/event tracking

#### Cloud & Sync
- [ ] Cross-device sync
- [ ] Cloud backup (encrypted)
- [ ] Data export (full JSON/CSV)
- [ ] Calendar sync (Google, Outlook, Apple)

#### Family Sharing (Pro add-on)
- [ ] Up to 6 family members
- [ ] Shared grocery lists
- [ ] Family calendar
- [ ] Kids' habit tracking
- [ ] Parental dashboard

---

## 4. AI MEMORY ARCHITECTURE

### How AI Memory Works (The Secret Sauce)

```
┌────────────────────────────────────────────────┐
│           USER INTERACTION LAYER               │
│  Chat / Voice / Module Actions / Data Entry    │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│           AI CONTEXT BUILDER                   │
│                                                │
│  1. Retrieve user profile summary              │
│  2. Query vector DB for relevant memories      │
│     (semantic search on user's question)        │
│  3. Pull recent module data (last 7 days)      │
│  4. Get active goals & streaks                 │
│  5. Check conversation history (last 5 msgs)   │
│                                                │
│  → Assembles a rich context window             │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│           LLM API CALL                         │
│                                                │
│  System Prompt:                                │
│  "You are Aura, a personal AI assistant.       │
│   Here is what you know about this user..."    │
│                                                │
│  + Assembled context                           │
│  + User's current message                      │
│  + Tool definitions (for actions)              │
│                                                │
│  Model: Claude claude-sonnet-4-6 (fast) or            │
│         Claude claude-opus-4-6 (deep analysis)        │
└──────────────────┬─────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│           POST-RESPONSE PROCESSOR              │
│                                                │
│  1. Execute any tool calls (log meal, etc.)    │
│  2. Extract new facts/preferences → embed      │
│     → store in AI_MEMORY_EMBEDDINGS            │
│  3. Update AI_USER_PROFILE if needed           │
│  4. Save conversation message                  │
│  5. Periodically summarize old conversations   │
│     → compress into memory embeddings          │
└────────────────────────────────────────────────┘
```

### Memory Types & Retrieval Strategy

| Memory Type | Storage | Retrieval |
|------------|---------|-----------|
| **Short-term** | Last 10 messages in conversation | Always included in context |
| **Working** | Active goals, today's data, streaks | Fetched fresh each request |
| **Long-term** | Vector embeddings (pgvector) | Semantic similarity search (top 10) |
| **Profile** | AI_USER_PROFILE table | Always included in context |
| **Episodic** | Conversation summaries | Retrieved when user references past |

### Memory Consolidation (Background Job)
- Every night: Summarize that day's conversations → create memory embeddings
- Every week: Analyze patterns across modules → update AI_USER_PROFILE
- Monthly: Prune low-importance memories (importance_score < 0.3, unused > 90 days)

---

## 5. API STRUCTURE

### API Routes (RESTful)

```
BASE URL: /api/v1

── AUTH ──────────────────────────────────────────
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/verify-otp
POST   /auth/social/{provider}       (Google, Apple, Facebook)
DELETE /auth/account                  (account deletion)

── USER ──────────────────────────────────────────
GET    /users/me
PATCH  /users/me
GET    /users/me/preferences
PATCH  /users/me/preferences
POST   /users/me/avatar
GET    /users/me/stats                (overall stats)
GET    /users/me/export               (data export)

── AI ────────────────────────────────────────────
POST   /ai/chat                       (send message, get response)
GET    /ai/conversations              (list conversations)
GET    /ai/conversations/:id          (get conversation)
DELETE /ai/conversations/:id
POST   /ai/voice                      (audio → text → response → audio)
GET    /ai/insights                   (weekly insights)
GET    /ai/suggestions                (proactive suggestions)
POST   /ai/analyze                    (cross-module analysis request)

── HEALTH ────────────────────────────────────────
GET    /health/profile
PATCH  /health/profile
POST   /health/logs
GET    /health/logs?type=X&from=&to=
GET    /health/dashboard              (aggregated stats)
POST   /health/workouts
GET    /health/workouts
GET    /health/workouts/:id
POST   /health/sleep
GET    /health/sleep?from=&to=
GET    /health/trends/:metric         (trend analysis)

── MEALS ─────────────────────────────────────────
POST   /meals/log
GET    /meals/logs?date=&type=
DELETE /meals/logs/:id
POST   /meals/photo-analyze           (AI food detection — Pro)
GET    /meals/plans
POST   /meals/plans
GET    /meals/nutrition-summary?date=
POST   /meals/water
GET    /meals/water?date=
GET    /meals/food-search?q=
POST   /meals/food-scan               (barcode)

── HABITS ────────────────────────────────────────
GET    /habits
POST   /habits
PATCH  /habits/:id
DELETE /habits/:id
POST   /habits/:id/complete
GET    /habits/:id/history
GET    /habits/stats                  (streaks, completion rates)

── TASKS ─────────────────────────────────────────
GET    /tasks?status=&priority=&project=
POST   /tasks
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/complete
GET    /tasks/today                   (today's tasks)
POST   /tasks/reorder

── PROJECTS ──────────────────────────────────────
GET    /projects
POST   /projects
PATCH  /projects/:id
DELETE /projects/:id
GET    /projects/:id/tasks

── CALENDAR ──────────────────────────────────────
GET    /calendar/events?from=&to=
POST   /calendar/events
PATCH  /calendar/events/:id
DELETE /calendar/events/:id
POST   /calendar/sync                 (external calendar sync)

── NOTES ─────────────────────────────────────────
GET    /notes?folder=&tag=
POST   /notes
PATCH  /notes/:id
DELETE /notes/:id
GET    /notes/search?q=

── EDUCATION ─────────────────────────────────────
GET    /learning/goals
POST   /learning/goals
PATCH  /learning/goals/:id
POST   /learning/sessions
GET    /learning/sessions?goal=
GET    /learning/flashcards?deck=
POST   /learning/flashcards
POST   /learning/flashcards/:id/review
POST   /learning/generate-flashcards  (AI — Pro)

── FINANCE ───────────────────────────────────────
GET    /finance/accounts
POST   /finance/accounts
GET    /finance/transactions?account=&category=&from=&to=
POST   /finance/transactions
GET    /finance/budgets
POST   /finance/budgets
GET    /finance/summary?period=
GET    /finance/savings-goals
POST   /finance/savings-goals

── SPORTS ────────────────────────────────────────
GET    /sports/profile
PATCH  /sports/profile
POST   /sports/activities
GET    /sports/activities?type=&from=&to=
GET    /sports/personal-bests
GET    /sports/training-plans
POST   /sports/training-plans/generate (AI — Pro)

── WELLNESS ──────────────────────────────────────
POST   /wellness/mood
GET    /wellness/mood?from=&to=
POST   /wellness/journal
GET    /wellness/journal
GET    /wellness/journal/:id
POST   /wellness/meditation
GET    /wellness/meditation/history
GET    /wellness/insights              (AI mood analysis — Pro)

── SOCIAL ────────────────────────────────────────
GET    /contacts
POST   /contacts
PATCH  /contacts/:id
GET    /contacts/birthdays/upcoming

── GAMIFICATION ──────────────────────────────────
GET    /gamification/profile           (XP, level, etc.)
GET    /gamification/achievements
GET    /gamification/daily-challenges
POST   /gamification/claim-reward/:id

── NOTIFICATIONS ─────────────────────────────────
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
GET    /notifications/settings
PATCH  /notifications/settings

── SUBSCRIPTION ──────────────────────────────────
GET    /subscription
POST   /subscription/checkout
POST   /subscription/cancel
POST   /subscription/restore
POST   /subscription/webhook           (Stripe/IAP webhook)
```

---

## 6. FRONTEND ARCHITECTURE

### Project Structure (React Native / Expo)

```
aura-app/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens group
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/                   # Main tab navigator
│   │   ├── index.tsx             # Dashboard (Hub)
│   │   ├── modules.tsx           # All modules grid
│   │   ├── ai.tsx                # AI Chat
│   │   ├── calendar.tsx          # Calendar view
│   │   └── profile.tsx           # Profile & settings
│   ├── modules/                  # Module detail screens
│   │   ├── health/
│   │   │   ├── index.tsx         # Health dashboard
│   │   │   ├── log.tsx           # Log health data
│   │   │   ├── workouts.tsx
│   │   │   ├── sleep.tsx
│   │   │   └── trends.tsx
│   │   ├── meals/
│   │   │   ├── index.tsx
│   │   │   ├── log.tsx
│   │   │   ├── plans.tsx
│   │   │   ├── water.tsx
│   │   │   └── scanner.tsx
│   │   ├── habits/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── create.tsx
│   │   ├── tasks/
│   │   │   ├── index.tsx
│   │   │   ├── [id].tsx
│   │   │   └── project/[id].tsx
│   │   ├── education/
│   │   │   ├── index.tsx
│   │   │   ├── goals.tsx
│   │   │   ├── flashcards.tsx
│   │   │   └── timer.tsx
│   │   ├── finance/
│   │   │   ├── index.tsx
│   │   │   ├── transactions.tsx
│   │   │   ├── budgets.tsx
│   │   │   └── goals.tsx
│   │   ├── sports/
│   │   │   ├── index.tsx
│   │   │   ├── activity.tsx
│   │   │   └── plans.tsx
│   │   ├── wellness/
│   │   │   ├── index.tsx
│   │   │   ├── mood.tsx
│   │   │   ├── journal.tsx
│   │   │   └── meditation.tsx
│   │   └── social/
│   │       ├── index.tsx
│   │       └── contacts.tsx
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── account.tsx
│   │   ├── subscription.tsx
│   │   ├── notifications.tsx
│   │   ├── privacy.tsx
│   │   └── appearance.tsx
│   └── _layout.tsx               # Root layout
├── components/
│   ├── ui/                       # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── GlassCard.tsx         # Glassmorphism card
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── ProgressRing.tsx      # Circular progress
│   │   ├── AnimatedCounter.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── dashboard/
│   │   ├── BentoGrid.tsx         # Main dashboard layout
│   │   ├── WidgetHealth.tsx
│   │   ├── WidgetHabits.tsx
│   │   ├── WidgetTasks.tsx
│   │   ├── WidgetMood.tsx
│   │   ├── WidgetFinance.tsx
│   │   ├── WidgetCalendar.tsx
│   │   └── WidgetQuickActions.tsx
│   ├── ai/
│   │   ├── ChatBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── VoiceButton.tsx       # The "Pulse" button
│   │   ├── SuggestionChips.tsx
│   │   └── InsightCard.tsx
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── HeatMap.tsx           # Habit/activity heatmap
│   │   └── RadarChart.tsx
│   └── shared/
│       ├── ModuleHeader.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── LoadingScreen.tsx
│       └── PaywallModal.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useAI.ts
│   ├── useVoice.ts
│   ├── useHealth.ts
│   ├── useMeals.ts
│   ├── useHabits.ts
│   ├── useTasks.ts
│   ├── useFinance.ts
│   ├── useNotifications.ts
│   ├── useSubscription.ts
│   └── useOfflineSync.ts
├── services/
│   ├── api.ts                    # Axios/fetch instance
│   ├── auth.service.ts
│   ├── ai.service.ts
│   ├── health.service.ts
│   ├── meals.service.ts
│   ├── habits.service.ts
│   ├── tasks.service.ts
│   ├── finance.service.ts
│   ├── sports.service.ts
│   ├── education.service.ts
│   ├── wellness.service.ts
│   ├── notification.service.ts
│   └── subscription.service.ts
├── stores/
│   ├── authStore.ts
│   ├── uiStore.ts
│   ├── dashboardStore.ts
│   └── offlineStore.ts
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   ├── animations.ts
│   └── index.ts
├── utils/
│   ├── date.ts
│   ├── format.ts
│   ├── validators.ts
│   ├── storage.ts
│   └── constants.ts
├── assets/
│   ├── fonts/
│   ├── icons/
│   ├── images/
│   └── animations/               # Lottie files
└── types/
    ├── api.ts
    ├── models.ts
    ├── navigation.ts
    └── modules.ts
```

### Backend Structure (Node.js / Fastify)

```
aura-api/
├── src/
│   ├── server.ts                 # Fastify app setup
│   ├── config/
│   │   ├── database.ts           # PostgreSQL + pgvector
│   │   ├── redis.ts
│   │   ├── ai.ts                 # LLM API configs
│   │   └── env.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── users/
│   │   ├── ai/
│   │   │   ├── ai.routes.ts
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts      # LLM orchestration
│   │   │   ├── memory.service.ts   # Vector memory CRUD
│   │   │   ├── context.builder.ts  # Assembles context window
│   │   │   ├── tools.ts            # AI tool definitions
│   │   │   └── voice.service.ts    # Whisper + TTS
│   │   ├── health/
│   │   ├── meals/
│   │   ├── habits/
│   │   ├── tasks/
│   │   ├── education/
│   │   ├── finance/
│   │   ├── sports/
│   │   ├── wellness/
│   │   ├── social/
│   │   ├── gamification/
│   │   ├── notifications/
│   │   └── subscription/
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── subscription.middleware.ts  # Check Pro features
│   │   └── validation.middleware.ts
│   ├── jobs/                     # BullMQ background jobs
│   │   ├── aiInsights.job.ts     # Nightly AI analysis
│   │   ├── memoryConsolidation.job.ts
│   │   ├── notifications.job.ts
│   │   ├── streakCalculation.job.ts
│   │   └── dataExport.job.ts
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── models/               # Drizzle ORM or Prisma
│   └── utils/
│       ├── embeddings.ts         # Text → vector embedding
│       ├── encryption.ts
│       ├── pagination.ts
│       └── errors.ts
├── tests/
├── prisma/ or drizzle/
├── Dockerfile
└── docker-compose.yml            # PostgreSQL + Redis + API
```

---

## 7. LANDING PAGE STRUCTURE

```
SECTIONS:
1. Hero — "Your Life. One App. Zero Noise."
   - 3D phone mockup with app dashboard
   - CTA: "Download Free" + "Watch Demo"
   - Animated gradient background

2. The Problem — "10 Apps. 10 Subscriptions. 1 Exhausted You."
   - Animated icons of competing apps fading away
   - Aura logo emerges

3. Feature Showcase — Interactive module carousel
   - Health → Meals → Habits → Tasks → Education → Finance → Sports → Wellness
   - Each card shows a phone mockup with that module

4. AI Section — "Meet Aura, Your AI That Actually Knows You"
   - Live chat demo (simulated)
   - Cross-module insight examples
   - Voice assistant demo video

5. Pricing — Simple 2-tier comparison
   - Free vs Pro feature table
   - "Start Free, Upgrade When Ready"

6. Social Proof — Testimonials, app store ratings, user count
7. FAQ
8. Footer — Download links, social, legal
```

---

## 8. DEVELOPMENT PHASES

### Phase 1: Foundation (Weeks 1-6)
- Project setup (Expo + Fastify + PostgreSQL + Redis)
- Auth system (email, social, OTP)
- User profiles & preferences
- Design system components
- Dashboard shell with empty widgets
- Navigation structure

### Phase 2: Core Modules (Weeks 7-14)
- Health tracking (basic)
- Meal logging + food database
- Habit tracker
- Task manager
- Notes system
- Offline storage + sync

### Phase 3: AI Integration (Weeks 15-20)
- AI chat interface
- Memory system (pgvector)
- Context builder
- Voice input/output
- Basic insights

### Phase 4: Premium Features (Weeks 21-28)
- Cross-module analysis
- Advanced health (wearable sync)
- AI meal photo recognition
- AI flashcard generation
- Training plan generation
- Finance auto-categorization

### Phase 5: Polish & Launch (Weeks 29-34)
- Landing page
- Subscription system (Stripe + IAP)
- Push notifications
- Gamification system
- Performance optimization
- App store submission

---

## 9. DESIGN TOKENS

```typescript
// theme/colors.ts
export const colors = {
  // Primary
  primary: '#6C5CE7',        // Rich purple
  primaryLight: '#A29BFE',
  primaryDark: '#4834D4',

  // Accent
  accent: '#00D2FF',          // Electric cyan
  accentGlow: 'rgba(0, 210, 255, 0.3)',

  // Semantic
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  info: '#74B9FF',

  // Neutrals (Dark theme)
  background: '#0F0F23',
  surface: '#1A1A2E',
  surfaceElevated: '#25253D',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',

  // Neutrals (Light theme)
  backgroundLight: '#F8F9FA',
  surfaceLight: '#FFFFFF',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6C6C80',

  // Module colors
  health: '#FF6B6B',
  meals: '#FDCB6E',
  habits: '#00B894',
  tasks: '#74B9FF',
  education: '#A29BFE',
  finance: '#00D2FF',
  sports: '#FF9FF3',
  wellness: '#55E6C1',
};

// theme/typography.ts
export const typography = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    display: 48,
  },
};
```

---

This is your complete blueprint. Where would you like to start building first?