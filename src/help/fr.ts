import type { HelpContent } from "./types";

const content: HelpContent = [
  {
    id: "start",
    icon: "start",
    title: "Bien démarrer",
    summary: "Ce qu'est Pilotask, les rôles, et comment l'installer.",
    articles: [
      {
        id: "start-what",
        title: "Pilotask en deux mots",
        blocks: [
          { type: "p", text: "Pilotask organise le travail des équipes en **projets**, découpés en **tableaux**, qui contiennent des **tâches**. Chaque tâche avance d'un statut à l'autre jusqu'à « Terminé »." },
          { type: "list", items: ["**Accueil** : ce qui vous attend aujourd'hui et ce qui est en retard.", "**Mes tâches** : tout ce qui vous est confié, toutes équipes confondues.", "**Projets** : les projets et leurs tableaux.", "**Calendrier** : les échéances, jour par jour.", "**Notifications** : ce qui a changé et vous concerne."] },
        ],
      },
      {
        id: "start-roles",
        title: "Qui voit et fait quoi",
        blocks: [
          { type: "list", items: [
            "**Super admin** : gère les personnes, les entités, les réglages, les clés API et le journal ; voit tout.",
            "**Manager** : crée et pilote les projets, tableaux et tâches de ses entités ; voit les analyses.",
            "**Chef de projet** : un utilisateur désigné sur un projet ; il en gère les tableaux, statuts et tâches, sans pouvoir l'archiver ni le supprimer.",
            "**Utilisateur** : voit ses tâches et les tableaux qui les contiennent ; fait avancer son travail et commente.",
            "**Lecteur** : consulte les projets et analyses de ses entités, sans rien modifier.",
          ] },
          { type: "tip", text: "Un projet appartient à une **entité** (filiale, site, département). On ne voit que les entités dont on fait partie, sauf les personnes rattachées à toutes les entités." },
        ],
      },
      {
        id: "start-install",
        title: "Installer l'application",
        blocks: [
          { type: "p", text: "Pilotask fonctionne dans le navigateur, sur ordinateur comme sur téléphone, et s'installe comme une application." },
          { type: "steps", items: ["Ouvrez **Paramètres**.", "Touchez **Installer l'application** (ou « Ajouter à l'écran d'accueil » sur iPhone, depuis le menu Partager de Safari).", "Autorisez les notifications pour être prévenu même application fermée."] },
        ],
      },
    ],
  },
  {
    id: "projects",
    icon: "projects",
    title: "Projets et tableaux",
    summary: "Créer, organiser et confier un projet.",
    articles: [
      {
        id: "projects-create",
        title: "Créer un projet",
        audience: "managers",
        blocks: [
          { type: "steps", items: ["Touchez le bouton **+** puis **Projet**.", "Donnez un nom, une couleur et une icône ; ajoutez des dates si le projet a un début et une fin.", "Choisissez l'entité concernée si vous en gérez plusieurs.", "Créez ensuite ses tableaux (par exemple « Chantier » et « Administratif »)."] },
        ],
      },
      {
        id: "projects-boards",
        title: "Tableaux et statuts",
        blocks: [
          { type: "p", text: "Un tableau regroupe des tâches en colonnes de statut. Chaque tableau commence avec quatre statuts : **À faire**, **En cours**, **Terminé** et **Annulé**." },
          { type: "p", text: "Vous pouvez ajouter vos propres statuts (« Contrôle », « Réception »…) et les réordonner par glisser-déposer. Chacun se range dans l'une des quatre catégories, ce qui garde les analyses comparables d'un tableau à l'autre." },
          { type: "warning", text: "Supprimer un statut demande où déplacer ses tâches : rien n'est perdu." },
        ],
      },
      {
        id: "projects-managers",
        title: "Nommer un chef de projet",
        audience: "managers",
        blocks: [
          { type: "p", text: "Un chef de projet est un utilisateur qui pilote un projet précis : il voit toutes ses tâches, crée des tableaux et des tâches, assigne, commente et suit les analyses du projet." },
          { type: "steps", items: ["Ouvrez le projet puis **Modifier**.", "Dans **Chefs de projet**, ajoutez une ou plusieurs personnes.", "Enregistrez : l'accès est immédiat, et retiré aussitôt si vous l'enlevez."] },
          { type: "tip", text: "Seuls les utilisateurs simples de l'entité du projet peuvent être nommés. Les managers gèrent déjà les projets de leurs entités." },
        ],
      },
      {
        id: "projects-archive",
        title: "Archiver ou supprimer",
        audience: "managers",
        blocks: [
          { type: "p", text: "Archivez un projet terminé : il disparaît des listes mais reste consultable via le filtre **Archivés**. La suppression est définitive et réservée aux managers." },
        ],
      },
    ],
  },
  {
    id: "tasks",
    icon: "tasks",
    title: "Tâches",
    summary: "Créer, assigner, faire avancer et partager le travail.",
    articles: [
      {
        id: "tasks-create",
        title: "Créer une tâche",
        audience: "projectManagers",
        blocks: [
          { type: "steps", items: ["Touchez **+** puis **Tâche**, ou le **+** en haut d'une colonne.", "Écrivez un titre clair, choisissez le tableau et le statut.", "Ajoutez si besoin une description, une priorité, des dates et des étiquettes.", "Assignez une ou plusieurs personnes : elles sont prévenues."] },
          { type: "tip", text: "Sur téléphone, **secouez l'appareil** pour ouvrir directement le menu de création." },
        ],
      },
      {
        id: "tasks-move",
        title: "Faire avancer une tâche",
        blocks: [
          { type: "p", text: "Glissez la carte vers une autre colonne, ou changez le statut depuis la tâche. Les personnes assignées peuvent toujours faire avancer leurs propres tâches." },
          { type: "p", text: "Passer une tâche à **Terminé** enregistre sa date de fin et prévient ceux qui la suivent." },
        ],
      },
      {
        id: "tasks-progress",
        title: "Montrer votre avancement",
        blocks: [
          { type: "p", text: "Une tâche peut porter un avancement de 0 à 100 %. Glissez le curseur ou touchez un palier ; il s'enregistre quand vous relâchez, et la barre s'affiche sur la carte et dans les listes." },
          { type: "tip", text: "L'avancement est facultatif. Une tâche **Terminé** affiche toujours 100 %. Utilisez **Ne plus suivre** pour retirer le chiffre." },
        ],
      },
      {
        id: "tasks-find",
        title: "Retrouver ses tâches",
        blocks: [
          { type: "list", items: ["**Mes tâches** rassemble tout ce qui vous est assigné, avec un onglet pour les tâches partagées avec vous.", "Les **filtres** combinent statut, priorité, personnes, étiquettes, échéance et retard.", "Le **tri** propose l'ordre manuel du tableau, l'échéance, la priorité ou la date de mise à jour."] },
        ],
      },
      {
        id: "tasks-share",
        title: "Partager une tâche en lecture seule",
        audience: "projectManagers",
        blocks: [
          { type: "p", text: "Ajoutez des **observateurs** à une tâche pour qu'une personne extérieure à l'équipe (autre entité, lecteur…) la suive sans pouvoir la modifier. Ils reçoivent ses changements de statut." },
          { type: "p", text: "Seuls ceux qui gèrent la tâche ajoutent ou retirent des observateurs." },
        ],
      },
      {
        id: "tasks-visibility",
        title: "Visibilité d'équipe",
        blocks: [
          { type: "p", text: "Par défaut, un utilisateur ne voit que ses propres tâches. La **visibilité d'équipe** lui montre aussi celles de ses collègues, en lecture seule, pour tout l'espace, une entité ou un seul tableau." },
        ],
      },
      {
        id: "tasks-observe-request",
        title: "Demander à observer une tâche",
        blocks: [
          { type: "p", text: "Si vous ne voyez que vos tâches, vous pouvez demander à observer d'autres travaux. Ouvrez **Demandes d'observation**, expliquez pourquoi, et choisissez un projet si c'est utile." },
          { type: "steps", items: ["Ouvrez **Demandes d'observation** puis **Nouvelle demande**.", "Dites ce que vous devez suivre, et le projet si vous le connaissez.", "Envoyez : un responsable décide, et vous êtes prévenu du résultat."] },
          { type: "tip", text: "Une fois acceptées, les tâches choisies deviennent lisibles pour vous, liées à votre demande." },
        ],
      },
      {
        id: "tasks-observe-decide",
        title: "Traiter les demandes d'observation",
        audience: "projectManagers",
        blocks: [
          { type: "p", text: "Les managers et chefs de projet examinent les demandes d'observation de leurs travaux dans **Demandes d'observation**." },
          { type: "steps", items: ["Ouvrez **Demandes d'observation** et lisez celles en attente.", "**Acceptez** en choisissant les tâches exactes à ouvrir à la personne.", "Ou **Refusez** avec un court motif."] },
          { type: "tip", text: "Qui a décidé, et le lien entre la demande et les tâches, est conservé." },
        ],
      },
    ],
  },
  {
    id: "comments",
    icon: "comments",
    title: "Commentaires et fichiers",
    summary: "Échanger sur une tâche, mentionner, joindre des documents.",
    articles: [
      {
        id: "comments-write",
        title: "Commenter et mentionner",
        blocks: [
          { type: "p", text: "Les commentaires gardent l'historique des échanges sur une tâche. Tapez **@** puis un nom pour mentionner quelqu'un : il est prévenu, s'il peut ouvrir la tâche." },
          { type: "p", text: "Vous pouvez modifier ou supprimer vos commentaires ; ceux qui gèrent le projet peuvent supprimer tout commentaire." },
        ],
      },
      {
        id: "comments-files",
        title: "Joindre des fichiers",
        blocks: [
          { type: "list", items: ["**Images** : JPG, PNG, WebP, SVG — jusqu'à 20 Mo. Elles sont redressées, allégées et débarrassées de leurs métadonnées (position GPS).", "**Documents** : PDF, Word, Excel, PowerPoint — jusqu'à 200 Mo.", "Jusqu'à **10 fichiers** par commentaire."] },
          { type: "p", text: "Les liens vers les fichiers sont privés et expirent après deux heures : un lien copié ne reste pas ouvert à tous." },
          { type: "warning", text: "Un fichier est vérifié par son contenu, pas par son nom : un document renommé (par exemple une page web appelée « plan.pdf ») est refusé." },
        ],
      },
    ],
  },
  {
    id: "calendar",
    icon: "calendar",
    title: "Calendrier et notifications",
    summary: "Les échéances, les alertes et les rapports par e-mail.",
    articles: [
      {
        id: "calendar-view",
        title: "Le calendrier",
        blocks: [{ type: "p", text: "Le calendrier place les tâches à leur échéance. Touchez un jour pour voir ses tâches, et une tâche pour l'ouvrir." }],
      },
      {
        id: "calendar-notifications",
        title: "Choisir ses notifications",
        blocks: [
          { type: "steps", items: ["Ouvrez **Paramètres → Notifications**.", "Pour chaque sujet (assignation, mention, échéance…), choisissez **e-mail** et/ou **push**.", "Utilisez **Envoyer un test** pour vérifier que tout arrive."] },
          { type: "tip", text: "Pas de notification sur le téléphone ? Vérifiez que l'application est installée et que le système l'autorise à envoyer des notifications." },
        ],
      },
      {
        id: "calendar-reports",
        title: "Rapports par e-mail",
        audience: "workspace",
        blocks: [{ type: "p", text: "Les managers et lecteurs peuvent recevoir un rapport **quotidien**, **hebdomadaire** ou **mensuel** sur l'avancement de leurs entités, depuis **Paramètres → Rapports par e-mail**." }],
      },
    ],
  },
  {
    id: "analytics",
    icon: "analytics",
    title: "Analyses",
    summary: "Suivre l'avancement et la charge des équipes.",
    articles: [
      {
        id: "analytics-read",
        title: "Lire les analyses",
        audience: "overview",
        blocks: [
          { type: "p", text: "Les analyses montrent les tâches créées et terminées, la répartition par statut et priorité, la charge par personne et les échéances à venir, sur la période choisie." },
          { type: "p", text: "Changez de portée (tout, un projet, un tableau, une personne) et, si vous gérez plusieurs entités, filtrez par entité. Le rapport s'exporte en PDF pour être partagé." },
          { type: "p", text: "Choisissez une période, ou touchez **Personnalisé** pour fixer des dates précises." },
          { type: "tip", text: "Un chef de projet voit les analyses de ses projets uniquement." },
        ],
      },
      {
        id: "analytics-mine",
        title: "Mes performances",
        blocks: [
          { type: "p", text: "Chaque utilisateur a un écran **Mes performances** : vos tâches créées et terminées, votre répartition par statut et priorité, et vos échéances, sur la période choisie." },
          { type: "p", text: "Il ne montre que votre travail. Choisissez une période prédéfinie ou une plage **Personnalisée**." },
        ],
      },
    ],
  },
  {
    id: "admin",
    icon: "admin",
    title: "Administration",
    summary: "Personnes, entités, étiquettes et accès.",
    articles: [
      {
        id: "admin-users",
        title: "Gérer les personnes",
        audience: "superAdmin",
        blocks: [
          { type: "steps", items: ["Ouvrez **Utilisateurs** puis **Nouvel utilisateur**.", "Choisissez le rôle et les entités ; sans entité, la personne est rattachée à toutes.", "Désactivez un compte plutôt que de le supprimer : l'historique est conservé."] },
          { type: "warning", text: "Retirer quelqu'un d'une entité le désassigne des tâches ouvertes de cette entité ; un aperçu indique l'impact avant d'enregistrer." },
        ],
      },
      {
        id: "admin-labels",
        title: "Étiquettes",
        audience: "managers",
        blocks: [{ type: "p", text: "Les étiquettes (« Urgent », « Client »…) sont communes à tous les projets. Les managers les créent et les renomment dans **Étiquettes**." }],
      },
      {
        id: "admin-journal",
        title: "Journal d'activité",
        audience: "superAdmin",
        blocks: [{ type: "p", text: "Le journal trace qui a fait quoi et quand : créations, modifications, déplacements, partages et connexions." }],
      },
      {
        id: "admin-apikeys",
        title: "Clés API",
        audience: "superAdmin",
        blocks: [
          { type: "p", text: "Les clés API permettent aux scripts et au job de build d'accéder à l'API. Créez-les dans **Paramètres → Clés API**." },
          { type: "steps", items: ["Touchez **Nouvelle clé**, nommez-la et choisissez ses droits : **Lecture**, **Écriture**, **Envoi d'APK**.", "Fixez une expiration si la clé ne doit pas vivre pour toujours.", "Copiez le jeton tout de suite — il n'est montré qu'une fois et ne peut pas être récupéré.", "**Révoquez** une clé pour l'arrêter aussitôt."] },
          { type: "warning", text: "Une clé agit au nom de la personne qui l'a créée ; ses droits limitent encore ce qu'elle peut faire. Gardez les jetons secrets." },
        ],
      },
    ],
  },
  {
    id: "account",
    icon: "account",
    title: "Mon compte",
    summary: "Profil, sécurité, apparence et langue.",
    articles: [
      {
        id: "account-profile",
        title: "Profil",
        blocks: [{ type: "p", text: "Votre carte, en haut des **Paramètres**, montre votre nom, votre rôle et vos entités. Ils sont tenus à jour par un super admin, dans **Utilisateurs** : demandez-lui une correction." }],
      },
      {
        id: "account-security",
        title: "Mot de passe",
        blocks: [{ type: "p", text: "**Paramètres → Sécurité** permet de changer votre mot de passe. Choisissez-en un long, que vous n'utilisez nulle part ailleurs." }],
      },
      {
        id: "account-mentions",
        title: "Être mentionné",
        blocks: [
          { type: "p", text: "**Paramètres → Mentions** contient un interrupteur pour autoriser ou bloquer les **@mentions** dans les commentaires. Désactivé, votre nom ne remonte pas pour être mentionné." },
        ],
      },
      {
        id: "account-look",
        title: "Thème, langue et menu",
        blocks: [
          { type: "list", items: ["**Thème** : clair, sombre, ou celui de l'appareil.", "**Langue** : français, anglais ou arabe (affichage de droite à gauche).", "Dans le menu latéral, les projets se replient ; votre choix est gardé sur cet appareil."] },
        ],
      },
      {
        id: "account-android",
        title: "Application Android",
        blocks: [
          { type: "p", text: "Quand un build est publié, les **Paramètres** affichent une carte **Application Android** avec la version et un téléchargement. Elle est réservée aux personnes connectées." },
          { type: "p", text: "Sur l'application Android, un build plus récent propose une mise à jour : touchez pour télécharger et installer." },
        ],
      },
    ],
  },
  {
    id: "faq",
    icon: "faq",
    title: "Questions fréquentes",
    summary: "Les réponses aux blocages les plus courants.",
    articles: [
      {
        id: "faq-missing-task",
        title: "Je ne vois pas une tâche",
        blocks: [{ type: "list", items: ["Elle ne vous est peut-être pas assignée : demandez à un responsable de vous l'assigner ou de vous la partager.", "Elle est peut-être filtrée : touchez **Réinitialiser** dans les filtres.", "Son projet est peut-être archivé, ou dans une entité dont vous ne faites pas partie."] }],
      },
      {
        id: "faq-upload",
        title: "Mon fichier est refusé",
        blocks: [{ type: "list", items: ["Vérifiez le format et la taille (images 20 Mo, documents 200 Mo).", "Le fichier est peut-être endommagé, ou son extension ne correspond pas à son contenu.", "Les images de plus de 60 mégapixels ne sont pas acceptées."] }],
      },
      {
        id: "faq-cannot-edit",
        title: "Je ne peux pas modifier une tâche",
        blocks: [{ type: "p", text: "Les tâches des autres sont en lecture seule pour les utilisateurs. Vous pouvez toujours faire avancer et commenter les vôtres ; pour le reste, demandez à un manager ou au chef de projet." }],
      },
    ],
  },
];

export default content;
