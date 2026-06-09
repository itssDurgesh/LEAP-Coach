import {
  Assignment,
  AppNotification,
  Book,
  Coupon,
  Course,
  CommunityPost,
  DailyTip,
  Enrollment,
  LiveSession,
  Note,
  PostComment,
  Question,
  RecommendedResource,
  Resource,
  Submission,
  TeamMember,
  User,
  Video,
  VideoProgress,
} from "@/lib/types";
import { PROFESSOR } from "@/lib/professor";

// ── deterministic id counters (stable within a runtime) ──
let Q = 0;
let R = 0;

function res(title: string, type: Resource["type"], url: string, author?: string): Resource {
  return { id: `r${++R}`, title, type, url, author };
}

function video(
  courseId: string,
  order: number,
  title: string,
  mins: number,
  summary: string,
  transcript: string,
  resources: Resource[] = [],
): Video {
  return {
    id: `${courseId}_v${order}`,
    courseId,
    title,
    order,
    durationSeconds: Math.round(mins * 60),
    muxPlaybackId: `mux_${courseId}_v${order}`,
    transcript,
    summary,
    notesPdfName: `${courseId}-session-${order}-notes.pdf`,
    resources,
  };
}

function mcq(prompt: string, options: string[], correctIndex: number, explanation: string): Question {
  return { id: `q${++Q}`, type: "mcq", prompt, options, correctAnswer: options[correctIndex], explanation };
}

function blank(prompt: string, wordBank: string[], correct: string, explanation: string): Question {
  return { id: `q${++Q}`, type: "fill_blank", prompt, options: wordBank, correctAnswer: correct, explanation };
}

function assignment(courseId: string, afterVideoOrder: number, title: string, questions: Question[]): Assignment {
  return { id: `${courseId}_a${afterVideoOrder}`, courseId, afterVideoOrder, title, questions };
}

// ─────────────────────────── COURSES ───────────────────────────

export const seedCourses: Course[] = [
  // ── Professional ──
  (() => {
    const id = "c_authentic_leader";
    const videos = [
      video(id, 1, "What Authentic Leadership Really Means", 22,
        "Authentic leadership starts with self-awareness and aligning daily actions with core values.",
        "Authentic leadership is not about a title — it's about who you are when no one is watching. We explore four pillars: self-awareness, relational transparency, balanced processing, and an internalized moral compass. The work of a leader is to lead from values, not from fear of judgement.",
        [res("Authentic Leadership — B. George", "book", "#", "Bill George")]),
      video(id, 2, "Discovering Your Leadership Values", 26,
        "A practical method to surface the 3–5 values that should anchor every leadership decision.",
        "Values are the operating system of a leader. In this session you'll run the 'peak and trough' exercise: recall your proudest and hardest moments, and extract the values that were present or violated. Narrow a long list down to three to five non-negotiables you can name in any room.",
        [res("Values Clarification Worksheet", "pdf", "#")]),
      video(id, 3, "Leading People With Trust", 24,
        "Trust is built through competence, consistency, and care — and rebuilt through accountability.",
        "Trust has three roots: do you know what you're doing, can I predict you, and do you care about me? When trust breaks, leaders restore it by naming the breach, owning their part, and changing behaviour visibly over time. Vulnerability accelerates trust when it's paired with reliability.",
        [res("The Speed of Trust", "book", "#", "Stephen M.R. Covey")]),
      video(id, 4, "Sustaining Authenticity Under Pressure", 28,
        "Pressure reveals defaults; design rituals that keep you anchored to values in hard moments.",
        "Under pressure we regress to old defaults. The antidote is pre-commitment: rituals, trusted advisors, and a personal decision filter you set in calm times. We close with a one-page 'leadership charter' you can return to whenever the stakes rise.",
        [res("Personal Leadership Charter (template)", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Foundations of Authenticity", [
        mcq("Which is NOT one of the four pillars of authentic leadership discussed?",
          ["Self-awareness", "Relational transparency", "Charismatic authority", "Internalized moral compass"], 2,
          "Charismatic authority is a Weberian leadership style, not a pillar of authentic leadership."),
        mcq("The 'peak and trough' exercise is primarily used to:",
          ["Set quarterly KPIs", "Surface your core values", "Map a competitor", "Plan a product launch"], 1,
          "Recalling peaks and troughs reveals which values were present or violated."),
        blank("Authentic leaders lead from their ____, not from fear of judgement.",
          ["values", "titles", "metrics", "instincts"], "values",
          "The session's thesis: lead from values, not fear."),
      ]),
      assignment(id, 4, "Checkpoint: Trust & Pressure", [
        mcq("Trust is most quickly rebuilt after a breach by:",
          ["Ignoring it until it fades", "Naming it, owning your part, and changing behaviour", "Blaming circumstances", "Offering a one-time apology"], 1,
          "Restoration requires acknowledgement, ownership, and visible behaviour change."),
        blank("Pre-commitment uses ____ set in calm times to protect values under pressure.",
          ["rituals", "salaries", "slogans", "audits"], "rituals",
          "Rituals and decision filters pre-committed in calm times anchor us under stress."),
      ]),
    ];
    return {
      id, slug: "the-authentic-leader", title: "The Authentic Leader",
      description: "Lead from who you are. A values-first program on building trust, presence, and resilience as a people leader — taught through real executive dilemmas.",
      category: "professional", instructorName: "Prof. Vishal Gupta", instructorTitle: "Professor of Organizational Behaviour, IIM Ahmedabad",
      instructorBio: "Professor of Organizational Behaviour at IIM Ahmedabad and past President of the Indian Academy of Management. Author of 4 leadership books and 67 research papers (3,500+ citations); his Coursera specialisation has reached 250K+ learners and he has trained 300K+ professionals across 35+ organisations.",
      instructorInitials: "VG",
      hashtags: ["#AuthenticLeadership", "#Trust", "#SelfAwareness", "#ExecutivePresence"],
      tracks: ["leading_self", "leading_people"], level: "Intermediate",
      rating: 4.9, ratingCount: 412, enrolledCount: 1840, purchaseCount: 1320, price: 1999,
      trending: true, published: true, accent: 0, videos, assignments,
      createdAt: "2026-02-10T09:00:00.000Z",
    } satisfies Course;
  })(),

  (() => {
    const id = "c_negotiation";
    const videos = [
      video(id, 1, "The Negotiator's Mindset", 20,
        "Shift from positions to interests; negotiation is joint problem-solving, not a battle.",
        "Most people negotiate over positions ('I want X'). Skilled negotiators dig for interests — the why behind the want. When both sides surface interests, the pie can grow before it's divided.",
        [res("Getting to Yes", "book", "#", "Fisher & Ury")]),
      video(id, 2, "Anchoring & Framing", 23,
        "First offers anchor the zone; framing changes how value is perceived.",
        "The first credible number anchors the negotiation. Prepare your anchor with justification, and re-anchor calmly if the other side opens aggressively. Framing a concession as a 'trade' rather than a 'give' preserves value.",
        [res("Anchoring cheat-sheet", "pdf", "#")]),
      video(id, 3, "Negotiating Upwards", 25,
        "Influence senior stakeholders by aligning your ask to their priorities and risk.",
        "Negotiating upward is about reducing your boss's risk while advancing your goal. Lead with their priorities, bring options not problems, and make the easy 'yes' the one you want.",
        []),
      video(id, 4, "Closing & Preserving Relationships", 21,
        "Close with clarity and protect the long-term relationship for repeated games.",
        "A good close confirms terms in writing, ends on a relational note, and leaves the other party able to say they did well. Most professional negotiations are repeated games — reputation compounds.",
        [res("Deal-closing checklist", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Mindset & Anchoring", [
        mcq("Negotiating over 'interests' rather than 'positions' tends to:",
          ["Shrink the available value", "Expand options before dividing value", "Always favour the buyer", "End negotiations faster only"], 1,
          "Surfacing interests lets both sides grow the pie before splitting it."),
        blank("The first credible number tends to ____ the negotiation zone.",
          ["anchor", "close", "void", "delay"], "anchor",
          "First credible offers anchor the perceived range."),
      ]),
      assignment(id, 4, "Checkpoint: Upwards & Closing", [
        mcq("The most effective way to negotiate upward is to:",
          ["Escalate emotionally", "Reduce the leader's risk while advancing your goal", "Withhold information", "Always accept the first counter"], 1,
          "Frame your ask around the leader's priorities and risk."),
        mcq("Because most professional negotiations are repeated games, you should:",
          ["Maximize one-time wins", "Protect the long-term relationship", "Avoid written terms", "Never concede anything"], 1,
          "Reputation compounds across repeated negotiations."),
      ]),
    ];
    return {
      id, slug: "executive-negotiation-mastery", title: "Executive Negotiation Mastery",
      description: "A practitioner's toolkit for high-stakes negotiation — mindset, anchoring, influencing upward, and closing while protecting relationships.",
      category: "professional", instructorName: "Dr. Ananya Rao", instructorTitle: "Negotiation Faculty & Executive Coach",
      instructorBio: "Dr. Ananya Rao has advised Fortune 500 leadership teams on complex commercial and partnership negotiations for over 15 years.",
      instructorInitials: "AR",
      hashtags: ["#Negotiation", "#Influence", "#Strategy", "#Communication"],
      tracks: ["leading_upwards", "leading_peers"], level: "Advanced",
      rating: 4.7, ratingCount: 268, enrolledCount: 1120, purchaseCount: 980, price: 2499,
      trending: false, published: true, accent: 1, videos, assignments,
      createdAt: "2026-02-18T09:00:00.000Z",
    } satisfies Course;
  })(),

  (() => {
    const id = "c_strategic_decisions";
    const videos = [
      video(id, 1, "Decision-Making Under Uncertainty", 24,
        "Separate decision quality from outcome quality; good decisions can have bad luck.",
        "Judge decisions by the process and information available at the time, not only by outcomes. A good process under uncertainty will win over many repetitions even when individual outcomes disappoint.",
        [res("Thinking in Bets", "book", "#", "Annie Duke")]),
      video(id, 2, "Mental Models & Bias", 27,
        "Use a latticework of mental models and guard against confirmation and sunk-cost bias.",
        "Great strategists carry a latticework of models — incentives, second-order effects, base rates. They actively hunt for disconfirming evidence and treat sunk costs as irrelevant to the next decision.",
        []),
      video(id, 3, "Leading Organizational Strategy", 26,
        "Strategy is choosing what NOT to do; align the organization around a few bets.",
        "Strategy is sacrifice. The leader's job is to choose a small number of bets and align resources, narrative, and metrics behind them — and to kill the activities that don't serve the strategy.",
        [res("Good Strategy / Bad Strategy", "book", "#", "Richard Rumelt")]),
      video(id, 4, "Communicating the Decision", 22,
        "Decisions don't ship until they're understood; communicate the why, the trade-offs, and the ask.",
        "A decision lives or dies on communication. State the decision, the why, the trade-offs you accepted, and the specific actions you need from each group. Repeat it more than feels necessary.",
        [res("Decision memo template", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Judgement", [
        mcq("'Resulting' is the error of:",
          ["Judging a decision only by its outcome", "Making too many decisions", "Ignoring data entirely", "Delegating decisions"], 0,
          "Resulting conflates decision quality with outcome quality."),
        blank("Under uncertainty, judge a decision by its ____ and the information available at the time.",
          ["process", "popularity", "speed", "cost"], "process",
          "Process quality beats outcome over repeated decisions."),
      ]),
      assignment(id, 4, "Checkpoint: Strategy & Communication", [
        mcq("According to the session, strategy is fundamentally about:",
          ["Doing everything well", "Choosing what NOT to do", "Maximizing headcount", "Copying competitors"], 1,
          "Strategy is sacrifice — a few aligned bets."),
        blank("A decision isn't real until it is ____ across the people who must act on it.",
          ["communicated", "filed", "automated", "audited"], "communicated",
          "Decisions ship through communication of the why and the ask."),
      ]),
    ];
    return {
      id, slug: "strategic-decision-making", title: "Strategic Decision-Making",
      description: "Make better calls under uncertainty. Mental models, bias-proofing, and the discipline of choosing — and communicating — a few winning bets.",
      category: "professional", instructorName: "Prof. Vishal Gupta", instructorTitle: "Professor of Organizational Behaviour, IIM Ahmedabad",
      instructorBio: "Professor of Organizational Behaviour at IIM Ahmedabad and past President of the Indian Academy of Management. A PhD from IIM Lucknow, he has authored 4 books on leadership and published 67 research papers cited 3,500+ times.",
      instructorInitials: "VG",
      hashtags: ["#Strategy", "#DecisionMaking", "#MentalModels", "#Leadership"],
      tracks: ["leading_organizations", "leading_self"], level: "Advanced",
      rating: 4.8, ratingCount: 190, enrolledCount: 760, purchaseCount: 540, price: 1499,
      trending: false, published: true, accent: 2, videos, assignments,
      createdAt: "2026-03-02T09:00:00.000Z",
    } satisfies Course;
  })(),

  // ── Student ──
  (() => {
    const id = "c_student_leadership";
    const videos = [
      video(id, 1, "Leadership Starts Before a Title", 16,
        "You can lead from any seat by taking ownership and helping the group win.",
        "Leadership isn't a role you wait for — it's a behaviour you choose. As a student you lead by taking ownership of outcomes, lifting your team, and modelling the standard you want to see.",
        [res("The Student Leadership Challenge", "book", "#", "Kouzes & Posner")]),
      video(id, 2, "Habits of High Performers", 19,
        "Small consistent systems beat bursts of motivation; design your defaults.",
        "High performers rely on systems, not willpower. Build tiny consistent habits — a fixed study block, a shutdown ritual, a weekly review — so good behaviour becomes the default.",
        [res("Atomic Habits", "book", "#", "James Clear")]),
      video(id, 3, "Communicating With Confidence", 18,
        "Clarity plus structure plus eye contact reads as confidence — and it's learnable.",
        "Confidence is a skill, not a trait. Structure your message (point, reason, example, point), slow down, and hold eye contact. Preparation converts anxiety into authority.",
        []),
      video(id, 4, "Working Well in Teams", 17,
        "Great teammates clarify goals, communicate early, and own their commitments.",
        "Teamwork fails on unclear goals and silent assumptions. Clarify who does what by when, over-communicate early, and keep your commitments small and kept.",
        [res("Team charter (template)", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Mindset & Habits", [
        mcq("According to the session, leadership is best understood as:",
          ["A title you're given", "A behaviour you choose", "A reward for seniority", "A personality type"], 1,
          "You can lead from any seat by choosing leadership behaviour."),
        blank("High performers rely on ____ rather than willpower.",
          ["systems", "luck", "titles", "moods"], "systems",
          "Consistent systems beat bursts of motivation."),
      ]),
      assignment(id, 4, "Checkpoint: Communication & Teams", [
        mcq("A simple structure for a confident message is:",
          ["Point, Reason, Example, Point", "Joke, Story, Joke", "Data dump", "Apologize, then speak"], 0,
          "PREP gives a clear, confident structure."),
        blank("Teamwork most often fails on unclear goals and silent ____.",
          ["assumptions", "budgets", "rooms", "logos"], "assumptions",
          "Unspoken assumptions derail teams; over-communicate early."),
      ]),
    ];
    return {
      id, slug: "foundations-of-leadership", title: "Foundations of Leadership for Students",
      description: "A friendly, practical starting point: build the mindset, habits, and communication skills that make you a leader long before you get the title.",
      category: "student", instructorName: "Meera Krishnan", instructorTitle: "Leadership Educator",
      instructorBio: "Meera Krishnan designs leadership curricula for universities and has mentored thousands of students into their first leadership roles.",
      instructorInitials: "MK",
      hashtags: ["#StudentLeadership", "#Habits", "#Confidence", "#Teamwork"],
      tracks: ["leading_self"], level: "Beginner",
      rating: 4.8, ratingCount: 532, enrolledCount: 3210, purchaseCount: 0, price: 0,
      trending: true, published: true, accent: 3, videos, assignments,
      createdAt: "2026-01-28T09:00:00.000Z",
    } satisfies Course;
  })(),

  (() => {
    const id = "c_career_launch";
    const videos = [
      video(id, 1, "Designing Your Career Story", 18,
        "A clear narrative connecting past, present and goal makes you memorable to recruiters.",
        "Recruiters remember stories, not bullet points. Craft a one-line narrative: where you've been, what you're great at, and where you're going. Everything on your CV should support that line.",
        [res("Designing Your Life", "book", "#", "Burnett & Evans")]),
      video(id, 2, "Acing the Interview", 21,
        "Use the STAR method and research-driven questions to stand out.",
        "Structure answers with STAR — Situation, Task, Action, Result — and quantify results. Close by asking thoughtful questions that show you've researched the team.",
        [res("STAR answer worksheet", "pdf", "#")]),
      video(id, 3, "Building a Professional Network", 19,
        "Networking is giving before asking; cultivate weak ties intentionally.",
        "Most opportunities come through weak ties. Network by offering value first — share, introduce, help — and keep a short list of relationships you nurture each month.",
        []),
      video(id, 4, "Your First 90 Days", 20,
        "Win early by learning fast, delivering a quick win, and managing expectations.",
        "In your first 90 days, prioritize learning, secure one visible quick win, and align with your manager on what success looks like. Early credibility compounds.",
        [res("First-90-days plan (template)", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Story & Interview", [
        mcq("The STAR method stands for:",
          ["Situation, Task, Action, Result", "Story, Talk, Ask, Repeat", "Skill, Talent, Ambition, Role", "Strategy, Tactic, Aim, Review"], 0,
          "STAR = Situation, Task, Action, Result."),
        blank("Recruiters remember ____, not bullet points.",
          ["stories", "fonts", "margins", "logos"], "stories",
          "A clear career narrative is more memorable than a list."),
      ]),
      assignment(id, 4, "Checkpoint: Network & 90 Days", [
        mcq("Most career opportunities tend to come through:",
          ["Weak ties", "Cold applications only", "Luck alone", "Family only"], 0,
          "Weak ties expose you to new information and opportunities."),
        blank("In your first 90 days, secure one visible quick ____.",
          ["win", "raise", "title", "office"], "win",
          "An early visible win builds credibility."),
      ]),
    ];
    return {
      id, slug: "ace-your-career-launch", title: "Ace Your Career Launch",
      description: "From CV to first promotion: build a standout story, interview with confidence, grow a real network, and crush your first 90 days.",
      category: "student", instructorName: "Rohan Desai", instructorTitle: "Career Strategist",
      instructorBio: "Rohan Desai is a career coach who has helped 5,000+ early-career professionals land and thrive in roles at top firms.",
      instructorInitials: "RD",
      hashtags: ["#CareerReadiness", "#Interview", "#Networking", "#FirstJob"],
      tracks: ["leading_self", "leading_peers"], level: "Beginner",
      rating: 4.6, ratingCount: 301, enrolledCount: 2140, purchaseCount: 1510, price: 999,
      trending: false, published: true, accent: 4, videos, assignments,
      createdAt: "2026-02-22T09:00:00.000Z",
    } satisfies Course;
  })(),

  // ── Entrepreneur ──
  (() => {
    const id = "c_idea_to_funded";
    const videos = [
      video(id, 1, "Finding a Problem Worth Solving", 23,
        "Start from a painful, frequent, urgent problem — not from a clever solution.",
        "Great startups begin with a problem that is painful, frequent, and urgent for a specific user. Fall in love with the problem, not your first solution, and talk to users before you build.",
        [res("The Mom Test", "book", "#", "Rob Fitzpatrick")]),
      video(id, 2, "Building an MVP", 25,
        "Ship the smallest thing that tests your riskiest assumption.",
        "An MVP isn't a tiny product — it's the smallest experiment that tests your riskiest assumption. Define the assumption, design the cheapest test, and decide in advance what result changes your mind.",
        [res("MVP canvas", "pdf", "#")]),
      video(id, 3, "Understanding Unit Economics", 24,
        "If you can't make the math work on one customer, scale makes it worse.",
        "Know your CAC, LTV, contribution margin, and payback period. If a single customer is unprofitable, growth multiplies the loss. Investors fund a working engine, not just a story.",
        [res("Unit-economics calculator", "pdf", "#")]),
      video(id, 4, "Pitching to Investors", 26,
        "A great pitch tells a clear story: problem, insight, traction, and the ask.",
        "Investors back clarity and momentum. Open with the problem and your unique insight, prove demand with traction, and make a specific ask with a plan for the money. Practice the first two minutes relentlessly.",
        [res("Seed pitch-deck outline", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Problem & MVP", [
        mcq("A strong startup problem is best described as:",
          ["Clever and novel", "Painful, frequent, and urgent", "Cheap to build for", "Popular on social media"], 1,
          "Pain + frequency + urgency for a specific user signals a worthwhile problem."),
        blank("An MVP is the smallest experiment that tests your riskiest ____.",
          ["assumption", "feature", "logo", "hire"], "assumption",
          "MVPs validate the riskiest assumption cheaply."),
      ]),
      assignment(id, 4, "Checkpoint: Economics & Pitch", [
        mcq("If unit economics are negative, scaling will:",
          ["Fix the math", "Multiply the loss", "Have no effect", "Guarantee funding"], 1,
          "Growth amplifies a broken per-customer model."),
        blank("A great pitch ends with a specific ____.",
          ["ask", "joke", "logo", "apology"], "ask",
          "Close with a clear ask and plan for the funds."),
      ]),
    ];
    return {
      id, slug: "idea-to-funded-startup", title: "From Idea to Funded Startup",
      description: "The founder's path from raw idea to a fundable company — problem discovery, MVPs, unit economics, and a pitch investors actually back.",
      category: "entrepreneur", instructorName: "Aditya Kapoor", instructorTitle: "Founder & Venture Partner",
      instructorBio: "Aditya Kapoor founded two venture-backed startups and now invests in early-stage founders as a venture partner.",
      instructorInitials: "AK",
      hashtags: ["#Startup", "#Fundraising", "#MVP", "#UnitEconomics"],
      tracks: ["leading_organizations", "leading_self"], level: "Intermediate",
      rating: 4.9, ratingCount: 356, enrolledCount: 1580, purchaseCount: 1290, price: 2499,
      trending: true, published: true, accent: 5, videos, assignments,
      createdAt: "2026-01-30T09:00:00.000Z",
    } satisfies Course;
  })(),

  (() => {
    const id = "c_high_perf_teams";
    const videos = [
      video(id, 1, "Hiring Your First Team", 21,
        "Hire for slope, not just intercept; protect culture from day one.",
        "Early hires define your culture. Hire for trajectory and values fit over raw pedigree, and write down the behaviours you reward before the team grows.",
        []),
      video(id, 2, "Psychological Safety", 23,
        "Teams perform when people can take risks without fear of humiliation.",
        "Google's Project Aristotle found psychological safety to be the top driver of team performance. Leaders build it by inviting dissent, responding to failure with curiosity, and modelling fallibility.",
        [res("The Fearless Organization", "book", "#", "Amy Edmondson")]),
      video(id, 3, "Setting Goals That Work", 22,
        "Use a few outcome-based goals with clear owners and cadence.",
        "Goals fail when they're vague or too many. Pick a few outcome-based goals, name a single owner each, and review them on a predictable cadence.",
        [res("OKR one-pager", "pdf", "#")]),
      video(id, 4, "Scaling Culture", 24,
        "Culture is what you tolerate; codify it before headcount dilutes it.",
        "Culture scales through stories, rituals, and what leaders tolerate. Codify values into observable behaviours and hire, promote, and let go in line with them.",
        []),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Hiring & Safety", [
        mcq("'Hire for slope, not intercept' means prioritize:",
          ["Current title", "Rate of growth/trajectory", "Salary history", "Alma mater"], 1,
          "Slope = trajectory; intercept = current level."),
        blank("Project Aristotle found ____ safety to be the top driver of team performance.",
          ["psychological", "financial", "physical", "data"], "psychological",
          "Psychological safety topped the list of performance drivers."),
      ]),
      assignment(id, 4, "Checkpoint: Goals & Culture", [
        mcq("Goals are most effective when they are:",
          ["Numerous and vague", "Few, outcome-based, with clear owners", "Set once a year only", "Kept secret"], 1,
          "A few owned, outcome-based goals reviewed on cadence work best."),
        blank("Culture is, in practice, what leaders ____.",
          ["tolerate", "tweet", "purchase", "ignore"], "tolerate",
          "What you tolerate becomes your culture."),
      ]),
    ];
    return {
      id, slug: "building-high-performance-teams", title: "Building High-Performance Teams",
      description: "Turn a group of hires into a team that compounds: psychological safety, goal systems, and a culture that survives scale.",
      category: "entrepreneur", instructorName: "Sara Thomas", instructorTitle: "Org Design Consultant",
      instructorBio: "Sara Thomas helps founders design organizations and cultures that scale from 5 to 500 people.",
      instructorInitials: "ST",
      hashtags: ["#Teams", "#Culture", "#PsychologicalSafety", "#OKRs"],
      tracks: ["leading_people", "leading_cultures"], level: "Intermediate",
      rating: 4.7, ratingCount: 214, enrolledCount: 990, purchaseCount: 720, price: 1799,
      trending: false, published: true, accent: 0, videos, assignments,
      createdAt: "2026-03-08T09:00:00.000Z",
    } satisfies Course;
  })(),

  (() => {
    const id = "c_growth_playbook";
    const videos = [
      video(id, 1, "Finding Your Growth Engine", 22,
        "Most companies have one dominant growth loop — find and feed it.",
        "Sustainable growth comes from a loop, not a one-off campaign. Identify whether your engine is viral, paid, or content/SEO, then concentrate resources on the one that compounds.",
        [res("Hacking Growth", "book", "#", "Sean Ellis")]),
      video(id, 2, "Activation & Retention", 24,
        "Retention is the truest signal of value; fix the leaky bucket before pouring in.",
        "Acquisition without retention is a leaky bucket. Define your activation moment, measure cohort retention, and improve the early experience before scaling spend.",
        [res("Retention cohort template", "pdf", "#")]),
      video(id, 3, "Pricing & Monetization", 23,
        "Price on value, test willingness to pay, and don't leave money on the table.",
        "Price reflects value, not cost. Interview customers on willingness to pay, experiment with tiers, and revisit pricing regularly — it's the highest-leverage lever you control.",
        []),
      video(id, 4, "Scaling Without Breaking", 25,
        "Scale the things that work and instrument everything so you can see what breaks.",
        "Scaling multiplies both strengths and cracks. Double down on proven channels, instrument your funnel, and build the operational muscle to keep quality as volume rises.",
        [res("Growth dashboard checklist", "pdf", "#")]),
    ];
    const assignments = [
      assignment(id, 2, "Checkpoint: Engine & Retention", [
        mcq("The truest signal that a product delivers value is strong:",
          ["Launch-day traffic", "Retention", "Press coverage", "Follower count"], 1,
          "Retention shows people keep coming back for value."),
        blank("Acquisition without retention is a leaky ____.",
          ["bucket", "pipeline", "budget", "funnel"], "bucket",
          "The leaky-bucket metaphor: fix retention before scaling spend."),
      ]),
      assignment(id, 4, "Checkpoint: Pricing & Scale", [
        mcq("Pricing should primarily reflect:",
          ["Your costs", "The value to the customer", "Competitor logos", "Round numbers"], 1,
          "Value-based pricing captures willingness to pay."),
        blank("Scaling multiplies both your strengths and your ____.",
          ["cracks", "logos", "holidays", "fonts"], "cracks",
          "Instrument and strengthen operations before scaling."),
      ]),
    ];
    return {
      id, slug: "growth-and-scaling-playbook", title: "Growth & Scaling Playbook",
      description: "A data-driven system for durable growth: find your engine, fix retention, price on value, and scale without breaking what works.",
      category: "entrepreneur", instructorName: "Vikram Rao", instructorTitle: "Growth Advisor",
      instructorBio: "Vikram Rao has led growth at multiple high-scale consumer startups and advises founders on growth strategy.",
      instructorInitials: "VR",
      hashtags: ["#Growth", "#Retention", "#Pricing", "#Scaling"],
      tracks: ["leading_organizations"], level: "Advanced",
      rating: 4.6, ratingCount: 178, enrolledCount: 680, purchaseCount: 470, price: 1499,
      trending: false, published: true, accent: 1, videos, assignments,
      createdAt: "2026-03-15T09:00:00.000Z",
    } satisfies Course;
  })(),
];

// ─────────────────────────── USERS ───────────────────────────

export const seedUsers: User[] = [
  {
    id: "u_admin", name: "Prof. Vishal Gupta", username: "vishalgupta", email: "admin@leapcoach.com", role: null, isAdmin: true,
    learningCredits: 0, subscriptionPlan: "none", ownedCourseIds: [],
    createdAt: "2026-01-01T08:00:00.000Z", lastActiveAt: "2026-06-01T08:30:00.000Z",
  },
  {
    id: "u_student", name: "Aarav Sharma", username: "aarav", email: "aarav@example.com", role: "student",
    age: 20, gender: "male", phone: "+91 98200 11111", phoneVerified: true, company: "VJTI Mumbai",
    nationality: "India", region: "Maharashtra",
    headline: "Engineering undergrad · aspiring product leader",
    bio: "Second-year student at VJTI Mumbai, building leadership and communication skills before I graduate. Big believer in systems over willpower.",
    learningCredits: 320, subscriptionPlan: "none",
    ownedCourseIds: ["c_student_leadership", "c_career_launch"],
    createdAt: "2026-03-10T08:00:00.000Z", lastActiveAt: "2026-05-31T19:10:00.000Z",
  },
  {
    id: "u_pro", name: "Priya Nair", username: "priya", email: "priya@example.com", role: "professional",
    age: 34, gender: "female", phone: "+91 98800 22222", phoneVerified: true, company: "Infosys",
    nationality: "India", region: "Karnataka",
    headline: "Engineering Manager @ Infosys · leading people, not just projects",
    bio: "Engineering manager learning to lead from values. Currently working through The Authentic Leader and loving the peak/trough exercise.",
    learningCredits: 640, subscriptionPlan: "all_access",
    subscriptionValidUntil: "2027-03-01T00:00:00.000Z", ownedCourseIds: [],
    createdAt: "2026-02-15T08:00:00.000Z", lastActiveAt: "2026-06-01T07:45:00.000Z",
  },
  {
    id: "u_ent", name: "Karan Patel", username: "karan", email: "karan@example.com", role: "entrepreneur",
    age: 29, gender: "male", phone: "+91 99000 33333", phoneVerified: true, company: "Foundpe (Founder)",
    nationality: "India", region: "Gujarat",
    headline: "Founder @ Foundpe · 0→1, talking to users daily",
    bio: "Building Foundpe. Learned more from 12 user interviews than 12 weeks of building. Here for the founder track and the live pitch teardowns.",
    learningCredits: 980, subscriptionPlan: "per_course",
    ownedCourseIds: ["c_idea_to_funded", "c_high_perf_teams"],
    createdAt: "2026-02-02T08:00:00.000Z", lastActiveAt: "2026-05-30T22:05:00.000Z",
  },
  {
    id: "u5", name: "Meera Iyer", username: "meera", email: "meera@example.com", role: "student",
    age: 22, gender: "female", nationality: "India", region: "Tamil Nadu", phoneVerified: true,
    learningCredits: 150, subscriptionPlan: "none", ownedCourseIds: ["c_student_leadership"],
    createdAt: "2026-03-20T08:00:00.000Z", lastActiveAt: "2026-05-29T12:00:00.000Z",
  },
  {
    id: "u6", name: "Rahul Verma", username: "rahul", email: "rahul@example.com", role: "professional",
    age: 41, gender: "male", nationality: "India", region: "Delhi", phoneVerified: true,
    learningCredits: 420, subscriptionPlan: "all_access", subscriptionValidUntil: "2027-01-15T00:00:00.000Z",
    ownedCourseIds: [], createdAt: "2026-01-18T08:00:00.000Z", lastActiveAt: "2026-05-28T09:30:00.000Z",
  },
  {
    id: "u7", name: "Sneha Gupta", username: "sneha", email: "sneha@example.com", role: "entrepreneur",
    age: 26, gender: "female", nationality: "India", region: "Uttar Pradesh", phoneVerified: false,
    learningCredits: 60, subscriptionPlan: "none", ownedCourseIds: [],
    createdAt: "2026-04-05T08:00:00.000Z", lastActiveAt: "2026-05-20T16:00:00.000Z",
  },
  {
    id: "u8", name: "Vikram Singh", username: "vikram", email: "vikram@example.com", role: "professional",
    age: 38, gender: "male", nationality: "India", region: "Punjab", phoneVerified: true,
    learningCredits: 0, subscriptionPlan: "none", ownedCourseIds: [], banned: true,
    createdAt: "2026-02-28T08:00:00.000Z", lastActiveAt: "2026-04-10T11:00:00.000Z",
  },
  {
    id: "u9", name: "Daniel Lee", username: "daniel", email: "daniel@example.com", role: "student",
    age: 19, gender: "male", nationality: "Singapore", region: "Singapore", phoneVerified: true,
    learningCredits: 230, subscriptionPlan: "none", ownedCourseIds: ["c_career_launch"],
    createdAt: "2026-03-25T08:00:00.000Z", lastActiveAt: "2026-05-31T14:20:00.000Z",
  },
  {
    id: "u10", name: "Fatima Khan", username: "fatima", email: "fatima@example.com", role: "professional",
    age: 31, gender: "female", nationality: "UAE", region: "Dubai", phoneVerified: true,
    learningCredits: 510, subscriptionPlan: "all_access", subscriptionValidUntil: "2027-02-01T00:00:00.000Z",
    ownedCourseIds: [], createdAt: "2026-02-10T08:00:00.000Z", lastActiveAt: "2026-06-01T06:00:00.000Z",
  },
];

// Default demo accounts per role (used by the quick sign-in shortcuts)
export const DEMO_ACCOUNTS: Record<string, string> = {
  student: "aarav@example.com",
  professional: "priya@example.com",
  entrepreneur: "karan@example.com",
  admin: "admin@leapcoach.com",
};
export const ADMIN_PASSWORD = "leap-admin"; // mock admin password

// ─────────────────────── ENROLLMENTS / PROGRESS ───────────────────────

const now = "2026-06-01T08:00:00.000Z";

export const seedEnrollments: Enrollment[] = [
  { userId: "u_student", courseId: "c_student_leadership", enrolledAt: "2026-03-11T08:00:00.000Z" },
  { userId: "u_student", courseId: "c_career_launch", enrolledAt: "2026-04-02T08:00:00.000Z" },
  { userId: "u_pro", courseId: "c_authentic_leader", enrolledAt: "2026-02-16T08:00:00.000Z" },
  { userId: "u_pro", courseId: "c_negotiation", enrolledAt: "2026-03-01T08:00:00.000Z" },
  { userId: "u_ent", courseId: "c_idea_to_funded", enrolledAt: "2026-02-03T08:00:00.000Z" },
  { userId: "u_ent", courseId: "c_high_perf_teams", enrolledAt: "2026-03-09T08:00:00.000Z" },
  { userId: "u5", courseId: "c_student_leadership", enrolledAt: "2026-03-21T08:00:00.000Z" },
  { userId: "u9", courseId: "c_career_launch", enrolledAt: "2026-03-26T08:00:00.000Z" },
];

function progress(userId: string, courseId: string, completedOrders: number[]): VideoProgress[] {
  const course = seedCourses.find((c) => c.id === courseId)!;
  return course.videos
    .filter((v) => completedOrders.includes(v.order))
    .map((v) => ({
      userId, videoId: v.id, courseId, completed: true,
      watchSeconds: v.durationSeconds, completedAt: now,
    }));
}

export const seedProgress: VideoProgress[] = [
  ...progress("u_student", "c_student_leadership", [1, 2]),
  ...progress("u_student", "c_career_launch", [1]),
  ...progress("u_pro", "c_authentic_leader", [1, 2, 3]),
  ...progress("u_pro", "c_negotiation", [1]),
  ...progress("u_ent", "c_idea_to_funded", [1, 2]),
];

export const seedSubmissions: Submission[] = [
  {
    id: "sub_seed_1", userId: "u_pro", assignmentId: "c_authentic_leader_a2", courseId: "c_authentic_leader",
    answers: {}, score: 100, passed: true, feedback: [], attemptNumber: 1, submittedAt: now,
  },
];

export const seedNotes: Note[] = [
  {
    id: "note_seed_1", userId: "u_pro", videoId: "c_authentic_leader_v2",
    text: "My 3 values: integrity, curiosity, courage. Use the peak/trough exercise with my team next sprint.",
    createdAt: now,
  },
];

// ─────────────────────────── CONTENT ───────────────────────────

export const seedTips: DailyTip[] = [
  { id: "tip1", text: "Lead from your values, not from fear of judgement.", author: "Prof. Vishal Gupta", targetRole: "all", active: true },
  { id: "tip2", text: "Systems beat motivation. Design your defaults and let them carry you.", author: "Meera Krishnan", targetRole: "student", active: true },
  { id: "tip3", text: "Fall in love with the problem, not your first solution.", author: "Aditya Kapoor", targetRole: "entrepreneur", active: true },
  { id: "tip4", text: "Judge decisions by your process, not just the outcome.", author: "Prof. Vishal Gupta", targetRole: "professional", active: true },
  { id: "tip5", text: "Retention is the truest signal that you've built something valuable.", author: "Vikram Rao", targetRole: "entrepreneur", active: true },
  { id: "tip6", text: "Confidence is a skill, not a trait — preparation converts anxiety into authority.", author: "Rohan Desai", targetRole: "all", active: true },
];

export const seedSessions: LiveSession[] = [
  {
    id: "sess1", title: "Live AMA: Authentic Leadership in Hard Times", courseTitle: "The Authentic Leader",
    instructorName: "Prof. Vishal Gupta", startsAt: "2026-06-02T13:30:00.000Z", durationMins: 60,
    meetLink: "https://meet.google.com/leap-auth-ama", targetRole: "professional",
    description: "Bring your toughest leadership dilemma. We'll work through real cases live.",
    attendeeIds: ["u_pro", "u6", "u10"], capacity: 100,
  },
  {
    id: "sess2", title: "Founder Office Hours: Pitch Teardowns", courseTitle: "From Idea to Funded Startup",
    instructorName: "Aditya Kapoor", startsAt: "2026-06-03T15:00:00.000Z", durationMins: 45,
    meetLink: "https://meet.google.com/leap-pitch-oh", targetRole: "entrepreneur",
    description: "Submit your deck and get live, candid feedback from an investor.",
    attendeeIds: ["u_ent", "u7"], capacity: 50,
  },
  {
    id: "sess3", title: "Student Success Clinic: Interview Prep", courseTitle: "Ace Your Career Launch",
    instructorName: "Rohan Desai", startsAt: "2026-06-04T11:00:00.000Z", durationMins: 60,
    meetLink: "https://meet.google.com/leap-interview-clinic", targetRole: "student",
    description: "Mock interviews and STAR-method practice with live coaching.",
    attendeeIds: ["u_student", "u5", "u9"], capacity: 80,
  },
];

export const seedResources: RecommendedResource[] = [
  { id: "rr1", title: "Authentic Leadership", type: "book", author: "Bill George", blurb: "The foundational text on leading from your true self.", targetRole: "professional", accent: 0 },
  { id: "rr2", title: "Atomic Habits", type: "book", author: "James Clear", blurb: "Build the systems that make high performance automatic.", targetRole: "student", accent: 3 },
  { id: "rr3", title: "The Mom Test", type: "book", author: "Rob Fitzpatrick", blurb: "How to talk to customers without lying to yourself.", targetRole: "entrepreneur", accent: 5 },
  { id: "rr4", title: "What Self-Awareness Really Is", type: "article", author: "HBR", blurb: "The research behind the most-cited leadership trait.", targetRole: "all", accent: 1 },
  { id: "rr5", title: "Good Strategy / Bad Strategy", type: "book", author: "Richard Rumelt", blurb: "Why most 'strategy' is fluff — and what real strategy looks like.", targetRole: "professional", accent: 2 },
  { id: "rr6", title: "The Fearless Organization", type: "book", author: "Amy Edmondson", blurb: "Build the psychological safety high-performing teams need.", targetRole: "entrepreneur", accent: 4 },
];

export const seedCommunity: CommunityPost[] = [
  { id: "p1", userId: "u_pro", userName: "Priya Nair", userRole: "professional", text: "Just finished 'Discovering Your Leadership Values' — the peak/trough exercise was a revelation. Anyone else map their top 3?", createdAt: "2026-05-31T18:20:00.000Z", likedBy: ["u_ent", "u6"] },
  { id: "p2", userId: "u_ent", userName: "Karan Patel", userRole: "entrepreneur", text: "MVP advice from the startup course saved me weeks. Shipped a Figma prototype instead of building. Got 12 user interviews already!", createdAt: "2026-05-31T20:05:00.000Z", likedBy: ["u_pro", "u7", "u_student"] },
  { id: "p3", userId: "u_student", userName: "Aarav Sharma", userRole: "student", text: "The STAR method genuinely helped me in a campus interview today. Thank you Leap Coach 🙌", createdAt: "2026-06-01T05:40:00.000Z", likedBy: ["u5", "u9"] },
  { id: "p4", userId: "u_admin", userName: "Prof. Vishal Gupta", userRole: "admin", text: "Welcome to the Leap community! Share your wins and questions here — I'll drop in weekly. Remember: lead from your values.", createdAt: "2026-05-30T09:00:00.000Z", likedBy: ["u_pro", "u_ent", "u_student", "u5", "u6"] },
  { id: "p5", userId: "u6", userName: "Rahul Verma", userRole: "professional", text: "Question for the group: how do you re-anchor in a negotiation when the other side opens way too aggressively?", createdAt: "2026-06-01T07:15:00.000Z", likedBy: ["u10"] },
];

export const seedCoupons: Coupon[] = [
  { code: "WELCOME10", discountPercent: 10, category: "all", active: true, maxRedemptions: 100, redemptions: 0, expiresAt: null, createdAt: "2026-06-01T00:00:00.000Z" },
  { code: "STUDENT20", discountPercent: 20, category: "student", active: true, maxRedemptions: null, redemptions: 0, expiresAt: null, createdAt: "2026-06-01T00:00:00.000Z" },
];

// ─────────────────────────── TEAM ───────────────────────────
// Seeded with the founder. Research associates / interns are added by the
// admin via the Team panel (or sent in by the professor).
export const seedTeam: TeamMember[] = [
  {
    id: "tm_founder",
    name: "Prof. Vishal Gupta",
    title: "Founder · Professor of Organizational Behaviour, IIM Ahmedabad",
    group: "founder",
    photoUrl: "/professor.jpg",
    bio: PROFESSOR.bio,
    vision:
      "To provide high-quality, evidence-based behavioural education in a practical and engaging manner to students, professionals and entrepreneurs.",
    links: {
      linkedin: PROFESSOR.links.linkedin,
      youtube: PROFESSOR.links.youtube,
      instagram: PROFESSOR.links.instagram,
      site: PROFESSOR.links.site,
    },
    featured: true,
    order: 0,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

// ─────────────────────────── BOOKS ───────────────────────────
export const seedBooks: Book[] = [
  {
    id: "bk_first_among_equals",
    title: "First Among Equals: T-R-E-A-T Leadership for L-E-A-P",
    author: "Prof. Vishal Gupta",
    coverUrl: null,
    blurb:
      "A practical T-R-E-A-T framework for leaders who must influence without authority and bring out the best in their peers — the philosophy at the heart of LEAP.",
    link: PROFESSOR.links.books,
    order: 0,
    active: true,
  },
  {
    id: "bk_demystifying_leadership",
    title: "Demystifying Leadership",
    author: "Prof. Vishal Gupta",
    coverUrl: null,
    blurb:
      "Evidence-based answers to the questions every leader asks — drawn from decades of research on motivation, authenticity, and high performance.",
    link: PROFESSOR.links.books,
    order: 1,
    active: true,
  },
];

// ───────────────────── DISCUSSION COMMENTS ─────────────────────
export const seedComments: PostComment[] = [
  {
    id: "cm1", postId: "p1", parentId: null, userId: "u_admin", userName: "Prof. Vishal Gupta", userRole: "admin",
    text: "Wonderful, Priya! Naming your top three values is exactly the first step. Which one surprised you most?",
    mentions: ["u_pro"], createdAt: "2026-05-31T19:00:00.000Z", likedBy: ["u_pro"],
  },
  {
    id: "cm2", postId: "p1", parentId: "cm1", userId: "u_pro", userName: "Priya Nair", userRole: "professional",
    text: "Thank you @vishalgupta — 'courage' surprised me the most.",
    mentions: ["u_admin"], createdAt: "2026-05-31T19:20:00.000Z", likedBy: [],
  },
  {
    id: "cm3", postId: "p5", parentId: null, userId: "u_pro", userName: "Priya Nair", userRole: "professional",
    text: "Re-anchor calmly with justification — don't react to their number, restate yours @rahul.",
    mentions: ["u6"], createdAt: "2026-06-01T07:30:00.000Z", likedBy: ["u6"],
  },
];

// ─────────────────────── NOTIFICATIONS ───────────────────────
export const seedNotifications: AppNotification[] = [
  {
    id: "nt1", userId: "u_pro", type: "reply", actorId: "u_admin", actorName: "Prof. Vishal Gupta",
    postId: "p1", commentId: "cm1", preview: "Wonderful, Priya! Naming your top three values…", read: false,
    createdAt: "2026-05-31T19:00:00.000Z",
  },
  {
    id: "nt2", userId: "u6", type: "mention", actorId: "u_pro", actorName: "Priya Nair",
    postId: "p5", commentId: "cm3", preview: "Re-anchor calmly with justification…", read: false,
    createdAt: "2026-06-01T07:30:00.000Z",
  },
];
