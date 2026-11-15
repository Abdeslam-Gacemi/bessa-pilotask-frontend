import type { HelpContent } from "./types";

const content: HelpContent = [
  {
    id: "start",
    icon: "start",
    title: "Getting started",
    summary: "What Pilotask is, the roles, and how to install it.",
    articles: [
      {
        id: "start-what",
        title: "Pilotask in a nutshell",
        blocks: [
          { type: "p", text: "Pilotask organises team work into **projects**, split into **tables**, which hold **tasks**. Each task moves from one status to the next until “Done”." },
          { type: "list", items: ["**Home**: what is due today and what is late.", "**My tasks**: everything assigned to you, across teams.", "**Projects**: projects and their tables.", "**Calendar**: due dates, day by day.", "**Notifications**: what changed and concerns you."] },
        ],
      },
      {
        id: "start-roles",
        title: "Who sees and does what",
        blocks: [
          { type: "list", items: [
            "**Super admin**: manages people, entities, settings and the activity log; sees everything.",
            "**Admin**: creates and runs the projects, tables and tasks of their entities; sees analytics.",
            "**Project manager**: a user named on one project; runs its tables, statuses and tasks, but cannot archive or delete it.",
            "**User**: sees their tasks and the tables holding them; moves their work along and comments.",
            "**Viewer**: reads the projects and analytics of their entities, changes nothing.",
          ] },
          { type: "tip", text: "A project belongs to an **entity** (subsidiary, site, department). You only see the entities you belong to, unless you belong to all of them." },
        ],
      },
      {
        id: "start-install",
        title: "Install the app",
        blocks: [
          { type: "p", text: "Pilotask runs in the browser, on computers and phones, and installs like an app." },
          { type: "steps", items: ["Open **Settings**.", "Tap **Install the app** (or “Add to Home Screen” on iPhone, from Safari's Share menu).", "Allow notifications to be alerted even when the app is closed."] },
        ],
      },
    ],
  },
  {
    id: "projects",
    icon: "projects",
    title: "Projects and tables",
    summary: "Create, organise and hand over a project.",
    articles: [
      {
        id: "projects-create",
        title: "Create a project",
        audience: "managers",
        blocks: [
          { type: "steps", items: ["Tap the **+** button, then **Project**.", "Give it a name, a colour and an icon; add dates if the project has a start and an end.", "Pick the entity if you manage several.", "Then create its tables (for example “Site” and “Paperwork”)."] },
        ],
      },
      {
        id: "projects-boards",
        title: "Tables and statuses",
        blocks: [
          { type: "p", text: "A table groups tasks into status columns. Every table starts with four statuses: **To do**, **In progress**, **Done** and **Canceled**." },
          { type: "p", text: "You can add your own statuses (“Review”, “Handover”…) and reorder them by drag and drop. Each one belongs to one of the four categories, which keeps analytics comparable from one table to another." },
          { type: "warning", text: "Deleting a status asks where its tasks should go: nothing is lost." },
        ],
      },
      {
        id: "projects-managers",
        title: "Name a project manager",
        audience: "managers",
        blocks: [
          { type: "p", text: "A project manager is a user who runs one project: they see all its tasks, create tables and tasks, assign, comment and follow the project's analytics." },
          { type: "steps", items: ["Open the project, then **Edit**.", "Under **Project managers**, add one or more people.", "Save: access is immediate, and removed at once if you take them off."] },
          { type: "tip", text: "Only simple users of the project's entity can be named. Admins already manage their entities' projects." },
        ],
      },
      {
        id: "projects-archive",
        title: "Archive or delete",
        audience: "managers",
        blocks: [
          { type: "p", text: "Archive a finished project: it leaves the lists but stays available through the **Archived** filter. Deleting is permanent and reserved for admins." },
        ],
      },
    ],
  },
  {
    id: "tasks",
    icon: "tasks",
    title: "Tasks",
    summary: "Create, assign, move and share work.",
    articles: [
      {
        id: "tasks-create",
        title: "Create a task",
        audience: "managers",
        blocks: [
          { type: "steps", items: ["Tap **+**, then **Task**, or the **+** at the top of a column.", "Write a clear title, pick the table and the status.", "Add a description, a priority, dates and labels if needed.", "Assign one or more people: they are notified."] },
          { type: "tip", text: "On a phone, **shake the device** to open the create menu straight away." },
        ],
      },
      {
        id: "tasks-move",
        title: "Move a task along",
        blocks: [
          { type: "p", text: "Drag the card to another column, or change the status from the task. Assignees can always move their own tasks." },
          { type: "p", text: "Moving a task to **Done** records its completion date and tells the people following it." },
        ],
      },
      {
        id: "tasks-find",
        title: "Find your tasks",
        blocks: [
          { type: "list", items: ["**My tasks** gathers everything assigned to you, with a tab for tasks shared with you.", "**Filters** combine status, priority, people, labels, due date and lateness.", "**Sort** offers the table's manual order, due date, priority or last update."] },
        ],
      },
      {
        id: "tasks-share",
        title: "Share a task read-only",
        audience: "projectManagers",
        blocks: [
          { type: "p", text: "Add **observers** to a task so someone outside the team (another entity, a viewer…) can follow it without changing it. They hear about its status changes." },
          { type: "p", text: "Only the people who manage the task add or remove observers." },
        ],
      },
      {
        id: "tasks-visibility",
        title: "Team visibility",
        blocks: [
          { type: "p", text: "By default a user only sees their own tasks. **Team visibility** also shows them their colleagues' tasks, read-only, for the whole workspace, one entity or a single table." },
        ],
      },
    ],
  },
  {
    id: "comments",
    icon: "comments",
    title: "Comments and files",
    summary: "Discuss a task, mention people, attach documents.",
    articles: [
      {
        id: "comments-write",
        title: "Comment and mention",
        blocks: [
          { type: "p", text: "Comments keep the history of the discussion on a task. Type **@** and a name to mention someone: they are notified, if they can open the task." },
          { type: "p", text: "You can edit or delete your comments; people who manage the project can delete any comment." },
        ],
      },
      {
        id: "comments-files",
        title: "Attach files",
        blocks: [
          { type: "list", items: ["**Pictures**: JPG, PNG, WebP, SVG — up to 20 MB. They are turned upright, made lighter and stripped of metadata (GPS position).", "**Documents**: PDF, Word, Excel, PowerPoint — up to 200 MB.", "Up to **10 files** per comment."] },
          { type: "p", text: "Links to files are private and expire after two hours: a copied link does not stay open to anyone." },
          { type: "warning", text: "A file is checked by its content, not its name: a renamed document (say, a web page called “plan.pdf”) is refused." },
        ],
      },
    ],
  },
  {
    id: "calendar",
    icon: "calendar",
    title: "Calendar and notifications",
    summary: "Due dates, alerts and e-mail reports.",
    articles: [
      {
        id: "calendar-view",
        title: "The calendar",
        blocks: [{ type: "p", text: "The calendar places tasks on their due date. Tap a day to see its tasks, and a task to open it." }],
      },
      {
        id: "calendar-notifications",
        title: "Choose your notifications",
        blocks: [
          { type: "steps", items: ["Open **Settings → Notifications**.", "For each topic (assignment, mention, due date…), choose **e-mail** and/or **push**.", "Use **Send a test** to check everything arrives."] },
          { type: "tip", text: "No notifications on your phone? Check the app is installed and that the system allows it to send notifications." },
        ],
      },
      {
        id: "calendar-reports",
        title: "E-mail reports",
        audience: "managers",
        blocks: [{ type: "p", text: "Admins and viewers can receive a **daily**, **weekly** or **monthly** report on their entities' progress, from **Settings → E-mail reports**." }],
      },
    ],
  },
  {
    id: "analytics",
    icon: "analytics",
    title: "Analytics",
    summary: "Follow progress and team workload.",
    articles: [
      {
        id: "analytics-read",
        title: "Read the analytics",
        audience: "managers",
        blocks: [
          { type: "p", text: "Analytics show tasks created and completed, the split by status and priority, workload per person and upcoming due dates, over the chosen period." },
          { type: "p", text: "Change the scope (everything, a project, a table, a person) and, if you manage several entities, filter by entity. The report exports to PDF for sharing." },
          { type: "tip", text: "A project manager sees the analytics of their projects only." },
        ],
      },
    ],
  },
  {
    id: "admin",
    icon: "admin",
    title: "Administration",
    summary: "People, entities, labels and access.",
    articles: [
      {
        id: "admin-users",
        title: "Manage people",
        audience: "superAdmin",
        blocks: [
          { type: "steps", items: ["Open **Users**, then **New user**.", "Choose the role and the entities; with no entity, the person belongs to all of them.", "Deactivate an account rather than deleting it: the history is kept."] },
          { type: "warning", text: "Removing someone from an entity unassigns them from that entity's open tasks; a preview shows the impact before you save." },
        ],
      },
      {
        id: "admin-labels",
        title: "Labels",
        audience: "managers",
        blocks: [{ type: "p", text: "Labels (“Urgent”, “Client”…) are shared by all projects. Admins create and rename them in **Labels**." }],
      },
      {
        id: "admin-journal",
        title: "Activity log",
        audience: "superAdmin",
        blocks: [{ type: "p", text: "The log records who did what and when: creations, changes, moves, shares and sign-ins." }],
      },
    ],
  },
  {
    id: "account",
    icon: "account",
    title: "My account",
    summary: "Profile, security, appearance and language.",
    articles: [
      {
        id: "account-profile",
        title: "Profile",
        blocks: [{ type: "p", text: "Your card at the top of **Settings** shows your name, role and entities. A super admin keeps them up to date in **Users**: ask them for any correction." }],
      },
      {
        id: "account-security",
        title: "Password",
        blocks: [{ type: "p", text: "**Settings → Security** lets you change your password. Pick a long one you use nowhere else." }],
      },
      {
        id: "account-look",
        title: "Theme, language and menu",
        blocks: [
          { type: "list", items: ["**Theme**: light, dark, or the device's.", "**Language**: French, English or Arabic (right-to-left display).", "In the side menu, projects fold away; your choice is kept on this device."] },
        ],
      },
    ],
  },
  {
    id: "faq",
    icon: "faq",
    title: "Frequent questions",
    summary: "Answers to the most common blockers.",
    articles: [
      {
        id: "faq-missing-task",
        title: "I cannot see a task",
        blocks: [{ type: "list", items: ["It may not be assigned to you: ask a manager to assign or share it with you.", "It may be filtered out: tap **Reset** in the filters.", "Its project may be archived, or in an entity you do not belong to."] }],
      },
      {
        id: "faq-upload",
        title: "My file is refused",
        blocks: [{ type: "list", items: ["Check the format and size (pictures 20 MB, documents 200 MB).", "The file may be damaged, or its extension may not match its content.", "Pictures over 60 megapixels are not accepted."] }],
      },
      {
        id: "faq-cannot-edit",
        title: "I cannot edit a task",
        blocks: [{ type: "p", text: "Other people's tasks are read-only for users. You can always move and comment on your own; for the rest, ask an admin or the project manager." }],
      },
    ],
  },
];

export default content;
