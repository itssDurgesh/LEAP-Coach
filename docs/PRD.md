# 📘 Leap Coach — Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** May 2026  
**Prepared by:** Durgesh Verma  
**Status:** Draft — Awaiting Final Review

---

## 1. Executive Summary

**Leap Coach** is an AI-enhanced online learning platform that delivers structured, avatar-led education to three distinct user personas — **Students, Professionals, and Entrepreneurs**. The platform uses pre-generated professor avatar videos (served via Mux), an integrated AI learning assistant (LEAP AI, powered by gemini), AI-evaluated assessments, and a comprehensive admin content management system.

**Tagline:** *"Scale Human Wisdom : Creating High Perfomace Stars."*

---

## 2. Product Vision & Goals

### Vision
Bridge the gap between expert human knowledge and learners at scale, using AI-powered avatars, structured learning tracks, and real-time AI assistance.

### Goals
| Goal | Metric |
|------|--------|
| Deliver structured, role-specific learning | 3 audience segments with curated catalogs |
| High engagement through AI assistance | LEAP Chatbot available on every video |
| Measurable learning outcomes | AI-graded assessments after every 2 videos |
| Scalable content management | Admin panel for course creation & analytics  and managing the studnets |


---

## 3. Target Users

### 3.1 Student
- **Age:** 16–25
- **Goal:** Academic skill-building, exam prep, career readiness
- **Pain Points:** Boring content, no personalization, no feedback loop
- **Tone:** Encouraging, structured, achievement-focused

### 3.2 Professional
- **Age:** 25–45
- **Goal:** Leadership, negotiation, strategy, executive skills
- **Pain Points:** Time constraints, needs flexible scheduling
- **Tone:** Executive, premium, results-driven

### 3.3 Entrepreneur
- **Age:** 22–50
- **Goal:** Business strategy, growth, fundraising, scaling
- **Pain Points:** Needs practical, actionable content — not theory
- **Tone:** Bold, action-oriented, community-driven

---

## 4. Complete User Flows

### 4.1 Onboarding Flow
```
Landing Page
  └─ CTA "Start Your Journey"
      └─ Sign Up (Clerk — Email / Google / LinkedIn)
          └─ Profile Selection Screen
                ├─ Student  → Student Dashboard
                ├─ Professional → Executive Dashboard
                └─ Entrepreneur → Entrepreneur Dashboard
                "Redesign this lanbding page
```

### 4.2 Course Enrollment Flow
```
Dashboard
  Edit this 
```

### 4.3 Core Learning Flow
```
Dashboard → My Courses → Select Course
  └─ Course Roadmap 
        └─ Click on course "videos list will pop out so that user can select which one to start with
              └─ Click Video → Course Player
                    ├─ [Main] Mux Avatar Video Player
                    ├─ [Right] LEAP AI Chatbot
                    └─ [Tabs] Class Notes | Transcript | Resources
                          └─ After 2 videos → Assignment Unlocks
                                └─ MCQ + Fill-in-the-Blanks
                                      └─ Submit → AI Grading (Claude API)
                                            └─ Score + Feedback → Next Videos Unlock
```

### 4.4 Admin Flow
```
Admin Login → Admin Control Center
  ├─ Overview Dashboard (analytics)
  ├─ Content Curator's Studio
  │     └─ New Course Wizard:
  │           1. Basic Info (title, description, category, instructor)
  │           2. Video Links (Mux playback IDs per video)
  │           3. Notes Upload (PDF per video)
  │           4. Transcript Input (text per video)
  │           5. Assignment Builder (MCQ + fill-blanks per video pair)
  │           6. Publish
  ├─ Analytics & Cohort Tracking everything should be realtime
  └─ User Management
```

---

## 5. Feature Requirements

### 5.1 Landing Page
"when someone opens the website this should be writing in motion word by word with the color of the logo which we will decide in later in this prd "Leadership Excellence and Authentic Perfomance" 
- **Hero Section:** Headline, sub-headline, professor photo, CTA buttons ("Start Your Journey")
- **Stats Bar:** 6+ Expert Mentors | 40+ Online Courses | 3 Learning Paths | AI-Enhanced Brand
- **Footer:** About | Terms of Service | Privacy | Contact Support
- **Style:** Clean white, Outfit font headings, professor  image right-aligned
## Prof. Vishal Gupta

📧 vishal@iima.ac.in  
📞 +91-79-7152-4935  
📍 502, Forum Tower IIMA New Campus, Vastrapur  

© 2026 Prof. Vishal Gupta. All rights reserved.


**Connect**

[![YouTube](#)](#) [![LinkedIn](#)](#) [![Instagram](#)](#)

**Subscribe for the latest**

[Subscribe →](#)
| **Prof. Vishal Gupta**                          | **Navigate**   | **Explore**      | **Connect**         |
|--------------------------------------------------|----------------|------------------|---------------------|
| 📧 vishal@iima.ac.in                            | [Home](#)      | [Research](#)    | YouTube · LinkedIn · Instagram |
| 📞 +91-79-7152-4935                             | [About](#)     | [Digital Avatar](#) | **Subscribe for the latest** |
| 📍 502, Forum Tower IIMA New Campus, Vastrapur  | [Courses](#)   | [Books](#)       |                     |
| © 2026 Prof. Vishal Gupta. All rights reserved. | [Trainings](#) |                  | *Admin Access*      |

---
*Admin Access*
---

### 5.2 Authentication (Clerk)
you can edit the authemtication methods
admin can only login via a email id and a passwords
- Email/Password 
- "Apply for Coaching" link (enterprise/B2B pathway)
- Protected routes via Clerk middleware
- User role stored in Supabase on first sign-up

---

### 5.3 Profile Selection Screen
- Three clickable cards: **Student | Professional | Entrepreneur**
- Each card: icon, role title, 1-line description, "Choose" CTA
- Selection saves `role` to Supabase `users` table
- Redirects to role-specific , 
redit this 

---

### 5.4 Dashboard (Role-Specific)

| Element | Description |
|---------|-------------|
| Welcome Banner | "Welcome back, [Name]" Coachee |
| Overall Progress | Circular progress ring (%)  it should be realtime |
| Next Session | Date + time card with "Join Session" CTA |
| Learning Credits | Points earned (gamification lite) (each course has the points and which agin admin will give the courses and based on the no of points he can get the tags)|
| Upcoming Sessions | List with course name + instructor |
| Recent Courses | Cards with thumbnail, title, progress bar |
| Daily Tip | "Wisdom of the Day" — pulled from admin-set tips |
| Recommended Resources | Book/article cards |
| Network Activity | Feed of peer activity (v2 feature) |

"Make sure admin has the acces to make the changes in Next session where the admin and put the google meet link and also amke the vote there how many persons has aggred to attend the  session and a mail and notification is to be made so that 1 day before the session a remined mail"

"every courses which is published should have 4 hashtags (which will be written by admin while uploading) and these hashtages must be visible to the in the couses below the name of course, and based on these hashtags recomentation courses should be shown, you can show the duration of course foe expale 1 hour, 1.5 hours etc ans ask the admin while uploading the course"

"in this section  Network Activity there should be a commity chat where any of the comment is made by any of the user is vissible to everyone and operations like edit delete must be there and so that everyone can chat and share their ideas, admin has the access to all these chats and can delete from everyone"

---

### 5.5 Course Catalog
  optimise it i have added few more informations
- Filtered automatically by user role on load
- Course cards: thumbnail, title, instructor name, duration, enrolled count, rating stars
- Search bar + filters: Category, Duration, and a select the option type filer which as the options like "Leading self, leading people, leading upwards, leading pears,leading cultures , leading organizations" these are few examples and again all these filetr categores are added to the course by admin and admin has the access in the admin paanel to add more such filters and 
- "Enrolled" badge on courses already joined

---
"Add-on information whena ny course is upload and admin maked it as trending it should be trening and all these information related to the courese like how many times a coures is bought and all this should be visible in the sepate section in the admin panel so that admin can track the courses"

### 5.6 Course Detail Page
- Hero: course thumbnail (wide), title, instructor avatar + name, rating, enrolled count
- Description paragraph
- Syllabus accordion (session wise preview) (for example when admin will be upladind videos say he upladed 4 video in that course then 4 session should be visible to the user)
- Instructor bio section
- "Enroll Now" CTA → saves to `enrollments` table

---

### 5.7 Course Roadmap (Post-Enrollment)
- re-edit and optimise it
- Expand session → Video list (numbered, with available status icons)
- Assignment indicator after every 2nd video
- Overall course progress bar at top

---

### 5.8 Course Player (Core Screen) ⭐
 you can redesign it if 
This is the most critical screen of the platform.

**Layout — Desktop:**
```
┌─────────────────────────────────────┬──────────────────┐
│                                     │                  │
│        MUX AVATAR VIDEO PLAYER      │  LEAP AI CHATBOT │
│   (Professor avatar, full quality)  │                  │
│                                     │   [Input box]    │
│   ▶ ━━━━━━━━━━━━━━━━━━  12:34/30:00 │   [Send button]  │
│   [Course title + Session name]     │                  │
├─────────────────────────────────────┴──────────────────┤
│  [Tabs: 📄 Class Notes | 📝 Transcript | 📎 Resources] │
│                                                         │
│  [PDF Viewer / Transcript text / Resource links]        │
│                              [Download Notes button]    │
└─────────────────────────────────────────────────────────┘
```

**Left Video Panel:**
- Mux player with `@mux/mux-player-react`
- Professor name + session number overlay (top-left)
- Course title
- "Next Video" CTA auto-appears on completion

**Right LEAP AI Chatbot Panel:**
- (here were are uplading the script of that session to the gemmini so that it can only answer based on that context no extra and irrelevent content)
- Header: "LEAP Coach AI"
- Chat history (context-aware to current video topic)
- Private Notes input (saved to `user_notes` table)
- Quick action buttons: "Summarize this lesson" | "Quiz me" | "Explain deeper"
- Powered by gemini api


""You can redeisgin if look betetr"

**Bottom Tab Bar:**
- **Class Notes Tab:** React PDF viewer rendering professor's uploaded PDF. Download button top-right.
- **Transcript Tab:** Full lesson transcript, auto-scrolling in sync with video (if timestamps available)
- **Resources Tab:** Linked external materials, books, articles

**After 2nd Video Completed:**
- Assignment unlock banner appears
- "Start Assignment" CTA → opens assignment modal/page

---

### 5.9 Assignments (AI-Graded)

**Trigger:** After every 2nd video in the course

**Question Types:**
1. **MCQ (Multiple Choice):** 4 options, single correct answer
2. **Fill in the Blanks with Options:** Blank in sentence + word bank below to choose from

**Flow:**
```
Assignment page loads
  └─ Questions displayed one by one (or all at once)
        └─ Student submits answers
              └─ Gemini API evaluates:
                    - Checks against correct_answer in DB
                    - Generates personalized feedback per question
                    - Returns overall score (0–100%)
                          ├─ Score ≥ 60% → Pass → Next videos unlock
                          └─ Score < 60% → Retry (max 10 attempts)
                                └─ After 10 fails → Videos still unlock (with note to review)
```

**Result Screen:**
- Score percentage (large, prominent)
- Per-question breakdown: ✅ Correct / ❌ Wrong + AI explanation
- "Continue Learning" CTA

---

### 5.10 LEAP AI Chatbot

**Location:** Embedded in Course Player (right panel)

**Capabilities:**
- Answer questions about the current lesson topic
- Summarize the video in bullet points
- Explain concepts in simpler terms
- Generate a quick quiz on demand
- Help with assignment questions (hints only, not answers)

**Technical Implementation:**
- gemini api
- System prompt includes: course title, video topic, chapter summary, transcript of that video which was uploaded during upload of the course
- Conversation history maintained per session (in-memory)
- Private notes saved to Supabase `user_notes`

---

### 5.11 Admin Panel
"add the necessay features which we were talking throughout this prd"
#### 5.11.1 Overview Dashboard (Command Center)
you can redesign it if needed for better visualization
| Metric | Display |
|--------|---------|
| Total Active Users | Large number card  " it showuld be real-time" |
| Course Completion Rate | Percentage with trend |
| Total Assessments Taken | Count |
| Avg. Completion Days | Days metric |
| Cohort Progress Telemetry | Progress bars per cohort |
| Live Activity Feed | Real-time user actions |
| Active Course Modules Table | Course name, instructor, enrolled, flag, status |

#### 5.11.2 Content Curator's Studio
- **Video Pipeline Status:** Upload queue, Mux processing status, ready/failed states
- **Asset Library:** Grid of course thumbnails with edit/delete actions
- **Wisdom Enrichment:** Manage daily tips shown on dashboard
- **New Course Button** → triggers Course Creation Wizard

#### 5.11.3 Course Creation Wizard (7 Steps)
add the left out informations here which i have added and discussed in the document
1. **Basic Info:** Title, description, category (Student/Professional/Entrepreneur), instructor name + photo (all to be stored in databse under a  sepcific column sor courses)
3. **Video Upload:** Mux playback ID + title + duration per video
4. **Notes Upload:** PDF file per video (stored in Supabase storage)
5. **Transcript:** Text input per video (supports copy-paste)
6. **Assignment Builder:** Per video pair — add MCQ questions + fill-blank questions + correct answers
7. **Review & Publish:** Preview, toggle draft/published

#### 5.11.4 Analytics (Strategic Overview)
"you can add the features here and make it more optimised"
- **Adaptive Test Gates:** Assessment pass rates, question difficulty heatmap
- **Question Bank Management:** Add/edit/delete questions
- **Cohort Velocity:** Learning pace per cohort (videos watched/day)
- **Enrollment Timeline:** Chart of signups over time

#### 5.11.5 User Management
" note at the time of signup ask the details or automaticaly fetch the details from his google acount and store it in the databse "Name, age, gender,email & phone number (verify it with otp), company/Collegue, Nationality."
 add the features like i can search and view anout the user and can be able to delete them or ban/unban from the app and
 and a separte data anlytic for the users fromaname which regoin, age group, genetce etc you can add from your end also. 
- Table: Name, email, role, courses enrolled, progress %, last active
- Click user → full profile with course progress details
- Filter by role / enrollment status

---

## 6. Tech Stack
i am flexible to make the chnages to tech stacs even with databse and auth and db client if needed 
"i also wanted to introduce the payment system like all courses acceess to 10,000/ year or 1,000 per couses lifetime access and or set the option so that admin can enter the price while uplaoding the course and make changesand set the subscription model, so build the logic and accodingly re-design the databse and other things

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Frontend + Server Actions |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS + CSS Modules | All UI styling |
| Auth | Clerk (`@clerk/nextjs`) | User auth + sessions |
| Database | Supabase (PostgreSQL) | All data storage |
| DB Client | `@supabase/supabase-js` | Secure server queries |
| Video | Mux (`@mux/mux-player-react`) | Avatar video streaming |
| PDF | React PDF | Notes viewer in browser |
| AI Chatbot | gemini | LEAP chatbot |
| AI Grading | gemini | Assignment evaluation |
| Icons | Lucide React | All UI icons |
| Fonts | Google Fonts (Outfit + Inter) | Typography |
| Deployment | Vercel | Hosting |

---

## 7. Database Schema
Redesign the entire datatsbe and make the necessay chnages and make sure login or signup dont fail they all work very smooth and better user experience

### `users`
```sql
id UUID PRIMARY KEY,
clerk_id TEXT UNIQUE NOT NULL,
name TEXT,
email TEXT UNIQUE NOT NULL,
role TEXT CHECK (role IN ('student', 'professional', 'entrepreneur')),
learning_credits INT DEFAULT 0,
created_at TIMESTAMP DEFAULT NOW()
```

### `courses`
```sql
id UUID PRIMARY KEY,
title TEXT NOT NULL,
description TEXT,
category TEXT CHECK (category IN ('student', 'professional', 'entrepreneur')),
instructor_name TEXT,
instructor_photo_url TEXT,
thumbnail_url TEXT,
total_weeks INT,
track_options TEXT[], -- ['1_week', '4_week'] or both
published BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT NOW()
```

### `weeks`
```sql
id UUID PRIMARY KEY,
course_id UUID REFERENCES courses(id),
week_number INT,
title TEXT
```

### `videos`
```sql
id UUID PRIMARY KEY,
week_id UUID REFERENCES weeks(id),
course_id UUID REFERENCES courses(id),
title TEXT,
mux_playback_id TEXT,
duration_seconds INT,
notes_pdf_url TEXT,
transcript_text TEXT,
order_index INT
```

### `enrollments`
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES users(id),
course_id UUID REFERENCES courses(id),
track_type TEXT CHECK (track_type IN ('1_week', '4_week')),
enrolled_at TIMESTAMP DEFAULT NOW(),
completed_at TIMESTAMP
```

### `video_progress`
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES users(id),
video_id UUID REFERENCES videos(id),
completed BOOLEAN DEFAULT FALSE,
watch_seconds INT DEFAULT 0,
completed_at TIMESTAMP
```

### `assignments`
```sql
id UUID PRIMARY KEY,
course_id UUID REFERENCES courses(id),
week_id UUID REFERENCES weeks(id),
after_video_index INT, -- 2, 4, 6 etc.
title TEXT
```

### `questions`
```sql
id UUID PRIMARY KEY,
assignment_id UUID REFERENCES assignments(id),
type TEXT CHECK (type IN ('mcq', 'fill_blank')),
question_text TEXT,
options JSONB, -- ["option1", "option2", "option3", "option4"]
correct_answer TEXT
```

### `assignment_submissions`
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES users(id),
assignment_id UUID REFERENCES assignments(id),
answers JSONB,
score DECIMAL,
ai_feedback JSONB,
attempt_number INT DEFAULT 1,
submitted_at TIMESTAMP DEFAULT NOW()
```

### `user_notes`
```sql
id UUID PRIMARY KEY,
user_id UUID REFERENCES users(id),
video_id UUID REFERENCES videos(id),
note_text TEXT,
created_at TIMESTAMP DEFAULT NOW()
```

### `daily_tips`
```sql
id UUID PRIMARY KEY,
tip_text TEXT,
target_role TEXT, -- 'all', 'student', 'professional', 'entrepreneur'
active BOOLEAN DEFAULT TRUE
```

---

## 8. UI Design System (from Stitch Sketches)
redesign it i wanted somethong like goldern yellow, light creamy, dark bule, white and something looking prodfessional and good 
### Color Palette
| Role | Color | Hex |
|------|-------|-----|
| Primary Action | Blue | `#2563EB` |
| Background | White | `#FFFFFF` |
| Surface | Light Gray | `#F8FAFC` |
| Text Primary | Dark Navy | `#1E293B` |
| Text Secondary | Gray | `#64748B` |
| Progress/Success | Green | `#22C55E` |
| Warning | Orange | `#F97316` |
| Admin Sidebar | Dark | `#0F172A` |

### Typography
| Use | Font | Weight |
|-----|------|--------|
| Page Headings | Outfit | 700 (Bold) |
| Section Headings | Outfit | 600 (SemiBold) |
| Body Text | Inter | 400 (Regular) |
| Labels / Captions | Inter | 500 (Medium) |

### Key UI Patterns
- Card-based layouts with subtle shadows
- Circular progress rings for completion %
- Week accordion for course roadmap
- Split-screen course player (video left, chatbot right)
- Dark sidebar with blue accent for admin
- Progress bars (blue fill on gray track)
- Tag/badge system for course categories

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Video Load Time | < 2 seconds (Mux CDN) |
| Auth Security | Clerk middleware on all protected routes |
| Scalability | Supabase handles 10,000+ concurrent users |
| Responsiveness | Mobile-first for student section |
| Accessibility | WCAG 2.1 AA minimum |
| AI Response Time | < 3 seconds (Gemini) |
| Uptime | 99.9% (Vercel + Supabase SLA) |

---
nothing has been completed 

## 10. MVP Scope (Phase 1)

- [x] Landing page (hero, stats, footer)
- [x] Authentication (Clerk — email + OAuth)
- [x] Profile selection (Student / Professional / Entrepreneur)
- [x] Role-specific dashboard
- [x] Course catalog (role-filtered)
- [x] Course detail + track selection
- [x] Course enrollment
- [x] Course roadmap (week accordion)
- [x] Course player (Mux video + LEAP chatbot + notes tabs)
- [x] Assignments (MCQ + fill-blank + AI grading)
- [x] Admin: course creation wizard
- [x] Admin: video/notes upload
- [x] Admin: basic overview dashboard

---

## 11. Phase 2 (Post-MVP)

- [ ] Completion certificates (PDF generated)
- [ ] Streaks & gamification badges
- [ ] Community Q&A section per vid
- [ ] Live cohort sessions (Zoom/Meet integration)
- [ ] Mobile app (React Native / Expo)
- [ ] Multi-language support
- [ ] Affiliate/referral program
- [ ] B2B enterprise licensing (org dashboards)

---

## 12. Open Questions / Decisions Needed

| # | Question | Owner |
|---|----------|-------|
| 1 | Will courses be free, paid, or subscription? | Founder |
| 2 | Payment gateway — Razorpay or Stripe? | Tech |
| 3 | Avatar video format — MP4 via Mux only? | Tech |
| 4 | Email notifications — Resend or SendGrid? | Tech |
| 5 | Will 4-week track auto-release on weekends or manually? | Product |
| 6 | Retry limit on assignments — 2 or unlimited? | Product |
| 7 | Who can be an admin — single superadmin or multi-role? | Founder |

---

*Document prepared by AutoStackAI for Leap Coach v1.0*
