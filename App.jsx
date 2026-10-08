import React, { useEffect, useMemo, useRef, useState } from "react";


// ============================================================
// Application de veille & capitalisation de la connaissance
// Cotation OTAN : source A–F, information 1–6
// ============================================================

const uid = () => Math.random().toString(36).slice(2, 10);

const FIABILITE = [
  { code: "A", label: "Totalement fiable" },
  { code: "B", label: "Habituellement fiable" },
  { code: "C", label: "Assez fiable" },
  { code: "D", label: "Habituellement non fiable" },
  { code: "E", label: "Non fiable" },
  { code: "F", label: "Fiabilité ne peut être jugée" },
];

const CREDIBILITE = [
  { code: "1", label: "Confirmée par d'autres sources" },
  { code: "2", label: "Probablement vraie" },
  { code: "3", label: "Peut-être vraie" },
  { code: "4", label: "Douteuse" },
  { code: "5", label: "Improbable" },
  { code: "6", label: "Véracité ne peut être jugée" },
];

const TYPES_ENTITE = [
  { code: "evenement", label: "Événement", couleur: "#e11d48", icone: "⚡" },
  { code: "personne", label: "Personne", couleur: "#2563eb", icone: "👤" },
  { code: "lieu", label: "Lieu", couleur: "#16a34a", icone: "📍" },
  { code: "objet", label: "Objet", couleur: "#d97706", icone: "📦" },
  { code: "organisation", label: "Organisation", couleur: "#7c3aed", icone: "🏛️" },
];

const TYPES_LIEN = [
  "même source", "membre de", "dirige", "participe à", "impliqué dans", "localisé à",
  "possède", "affilié à", "allié de", "cible de", "communicant avec", "lien familial",
];

// Crée systématiquement un lien « même source » entre toutes les entités rattachées à un même rapport
function lierMemeSource(d) {
  const existants = new Set(d.liens.map((l) => [l.fromId, l.toId].sort().join("|")));
  d.rapports.forEach((r) => {
    const ids = (r.entitesIds || []).filter((id) => d.entites.some((e) => e.id === id));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const cle = [ids[i], ids[j]].sort().join("|");
        if (existants.has(cle)) continue;
        existants.add(cle);
        d.liens.push({
          id: uid(),
          fromId: ids[i],
          toId: ids[j],
          type: "même source",
          commentaire: "Issu du même rapport : " + r.titre,
        });
      }
    }
  });
  return d;
}

const couleurType = (t) => { const x = TYPES_ENTITE.find((e) => e.code === t); return x ? x.couleur : "#555"; };
const iconeType = (t) => { const x = TYPES_ENTITE.find((e) => e.code === t); return x ? x.icone : "•"; };

const DB_KEY = "veille-renseignement-db-v1";
const DB_MAJ_KEY = "veille-renseignement-maj-v1";
// Base de référence : fichier base.json du dépôt GitHub, consulté automatiquement au démarrage.
// L'application reste pleinement fonctionnelle hors ligne (stockage local).
const RAW_URL = "https://raw.githubusercontent.com/reSqur-dygcus-wumvu8/Poste-de-veille/main/base.json";

const DB_DEMO = {
  veilles: [
    { id: "v1", nom: "Géopolitique Europe de l'Est", thematiques: "conflits, diplomatie, énergie", creeeLe: "2026-09-28" },
    { id: "v2", nom: "Cybersécurité critique", thematiques: "infrastructures, attaques, régulation", creeeLe: "2026-10-01" },
  ],
  sources: [
    { id: "s1", nom: "Agence de presse internationale", type: "ouverte", fiabilite: "B", description: "Dépêches vérifiées, citations croisées", veilleId: "v1" },
    { id: "s2", nom: "Rapport interne confidentiel", type: "fermee", fiabilite: "C", description: "Document classifié fourni par un contact", veilleId: "v1" },
    { id: "s3", nom: "Blog spécialisé sécurité", type: "ouverte", fiabilite: "D", description: "Analyses pointues mais partisanes", veilleId: "v2" },
  ],
  rapports: [
    {
      id: "r1", titre: "Sommet régional sur la sécurité énergétique",
      contenu: "Un sommet réunit plusieurs dirigeants et organisations à Varsovie pour discuter de la sécurisation des infrastructures énergétiques.",
      dateInfo: "2026-09-30T09:00", cotationInfo: "2", sourceId: "s1", veilleId: "v1",
      entitesIds: ["e1", "e2", "e3", "e4"],
      informations: [
        { texte: "Le sommet s'ouvre le 30 septembre à 9h à Varsovie.", cotation: "2" },
        { texte: "Une coopération renforcée sur les infrastructures énergétiques serait annoncée.", cotation: "3" },
      ],
    },
    {
      id: "r2", titre: "Cyberattaque contre un opérateur électrique",
      contenu: "Un groupe clandestin a ciblé un opérateur électrique européen via une faille d'un équipement industriel.",
      dateInfo: "2026-10-02T03:30", cotationInfo: "3", sourceId: "s2", veilleId: "v2",
      entitesIds: ["e5", "e6", "e7"],
      informations: [
        { texte: "L'attaque a eu lieu dans la nuit du 1er au 2 octobre.", cotation: "2" },
        { texte: "Le groupe « Tempête » serait à l'origine de l'intrusion.", cotation: "4" },
      ],
    },
  ],
  entites: [
    { id: "e1", type: "evenement", nom: "Sommet de Varsovie", resume: "Sommet régional sur la sécurité énergétique", dateHeure: "2026-09-30T09:00", lieu: "Varsovie", prenom: "", biographie: "", latitude: "", longitude: "", description: "", rapportIds: ["r1"] },
    { id: "e2", type: "personne", nom: "Nowak", resume: "Négociatrice en chef", dateHeure: "", lieu: "", prenom: "Anna", biographie: "Diplomate chevronnée, spécialiste des questions énergétiques.", latitude: "", longitude: "", description: "", rapportIds: ["r1"] },
    { id: "e3", type: "lieu", nom: "Varsovie", resume: "Capitale, hôte du sommet", dateHeure: "", lieu: "", prenom: "", biographie: "", latitude: "52.23", longitude: "21.01", description: "", rapportIds: ["r1"] },
    { id: "e4", type: "organisation", nom: "Conseil énergétique régional", resume: "Organisation intergouvernementale", dateHeure: "", lieu: "", prenom: "", biographie: "", latitude: "", longitude: "", description: "Coordonne les politiques énergétiques.", rapportIds: ["r1"] },
    { id: "e5", type: "organisation", nom: "Groupe clandestin « Tempête »", resume: "Groupe cybercriminel suspecté", dateHeure: "", lieu: "", prenom: "", biographie: "", latitude: "", longitude: "", description: "Connu pour des attaques contre des infrastructures.", rapportIds: ["r2"] },
    { id: "e6", type: "lieu", nom: "Poste de transformation Est", resume: "Site ciblé par la cyberattaque", dateHeure: "", lieu: "", prenom: "", biographie: "", latitude: "50.85", longitude: "4.35", description: "", rapportIds: ["r2"] },
    { id: "e7", type: "objet", nom: "Routeur industriel SCC-200", resume: "Équipement vulnérable exploité", dateHeure: "", lieu: "", prenom: "", biographie: "", latitude: "", longitude: "", description: "Matériel SCADA comportant la faille exploitée.", rapportIds: ["r2"] },
  ],
  liens: [
    { id: "l1", fromId: "e2", toId: "e4", type: "membre de", commentaire: "Représente son pays au conseil" },
    { id: "l2", fromId: "e2", toId: "e1", type: "participe à", commentaire: "" },
    { id: "l3", fromId: "e1", toId: "e3", type: "localisé à", commentaire: "" },
    { id: "l4", fromId: "e4", toId: "e1", type: "impliqué dans", commentaire: "" },
    { id: "l5", fromId: "e5", toId: "e6", type: "cible de", commentaire: "Attaque du 02/10/2026" },
    { id: "l6", fromId: "e7", toId: "e6", type: "localisé à", commentaire: "" },
    { id: "l7", fromId: "e5", toId: "e7", type: "possède", commentaire: "Utilisé comme vecteur d'intrusion" },
  ],
};

function chargerDB() {
  const fusionnerAfrique = (d) => {
    d.veilles = d.veilles.filter((v) => v.id !== "v3");
    d.sources = d.sources.filter((s) => !s.id.startsWith("s1") || ["s1", "s2", "s3"].includes(s.id));
    d.rapports = d.rapports.filter((r) => !["r10", "r11", "r12", "r13", "r14", "r15"].includes(r.id));
    d.veilles.push(...VEILLE_AFRIQUE.veilles);
    const idsSources = new Set(VEILLE_AFRIQUE.sources.map((s) => s.id));
    d.sources = d.sources.filter((s) => !idsSources.has(s.id));
    d.sources.push(...VEILLE_AFRIQUE.sources);
    d.rapports.push(...VEILLE_AFRIQUE.rapports);
    if (!d.rejets) d.rejets = [];
    d.entites.forEach((e) => {
      if (e.type === "lieu" && !e.latitude && !e.longitude) {
        const gaz = GAZETTIER_TROUVER(e.nom);
        if (gaz) { e.latitude = gaz.lat; e.longitude = gaz.lng; }
      }
    });
    return d;
  };
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { const d = JSON.parse(raw); if (!d.rejets) d.rejets = []; return lierMemeSource(fusionnerAfrique(d)); }
  } catch (e) {}
  return lierMemeSource({
    veilles: [...DB_DEMO.veilles, ...VEILLE_AFRIQUE.veilles],
    sources: [...DB_DEMO.sources, ...VEILLE_AFRIQUE.sources],
    rapports: [...DB_DEMO.rapports, ...VEILLE_AFRIQUE.rapports],
    entites: DB_DEMO.entites,
    liens: DB_DEMO.liens,
    rejets: [],
  });
}

// Flux d'actualisation à la demande (recoupé le 3 octobre 2026) : le bouton « Actualiser » injecte l'article suivant dans la veille
const FLUX_ACTUALISATION = {
  v3: [
    {
      titre: "Mali : rentrée scolaire 2026-2027 dans un contexte sécuritaire préoccupant",
      contenu: "La rentrée scolaire 2026-2027 a débuté le 1er octobre 2026 au Mali dans un contexte sécuritaire toujours préoccupant. Selon la revue de presse de l'Afrique francophone du 1er octobre, les autorités maliennes maintiennent l'école publique dans plusieurs régions du centre et du nord du pays, où les groupes armés restent actifs. Les enseignants dénoncent des conditions de sécurité insuffisantes dans les écoles de la région de Mopti.",
      url: "https://fr.allafrica.com/stories/202610010154.html",
      sourceId: "s14",
      dateInfo: "2026-10-01T08:00",
      cotationInfo: "2",
      informations: [
        { texte: "La rentrée scolaire 2026-2027 a débuté le 1er octobre 2026 au Mali, région de Mopti.", cotation: "2" },
        { texte: "Les enseignants dénoncent des conditions de sécurité insuffisantes dans les écoles de la région de Mopti.", cotation: "3" },
      ],
    },
    {
      titre: "Sénégal : l'Assemblée nationale adopte la loi sur la santé en milieu carcéral",
      contenu: "L'Assemblée nationale sénégalaise a adopté le 30 septembre 2026 la proposition de loi n°39/2026 relative à la santé en milieu carcéral, avec 130 voix favorables, dont 18 par procuration, lors de l'examen en séance plénière. Le texte renforce la prise en charge sanitaire des détenus dans les établissements pénitentiaires du Sénégal.",
      url: "https://fr.allafrica.com/view/group/main/main/id/00098306.html",
      sourceId: "s14",
      dateInfo: "2026-10-01T09:00",
      cotationInfo: "2",
      informations: [
        { texte: "L'Assemblée nationale a adopté à Dakar la proposition de loi n°39/2026 sur la santé en milieu carcéral.", cotation: "2" },
      ],
    },
    {
      titre: "Afrique de l'Ouest : la croissance de l'UEMOA atteint 6 % au deuxième trimestre 2026",
      contenu: "Selon les données publiées début octobre 2026, la croissance économique de l'Union économique et monétaire ouest-africaine (UEMOA) s'est établie à 6 % au deuxième trimestre 2026. La dynamique est portée par les investissements en Afrique de l'Ivoire et au Sénégal, malgré les tensions commerciales mondiales.",
      url: "https://fr.allafrica.com/",
      sourceId: "s14",
      dateInfo: "2026-10-03T10:00",
      cotationInfo: "2",
      informations: [
        { texte: "La croissance de l'UEMOA s'établit à 6 % au deuxième trimestre 2026, portée par la Côte d'Ivoire et le Sénégal.", cotation: "2" },
      ],
    },
    {
      titre: "RDC : crash d'un avion le 25 septembre, 17 morts dont des officiers des forces armées",
      contenu: "Dix-sept personnes, dont plusieurs officiers de l'armée congolaise, ont péri le 25 septembre 2026 dans le crash d'un avion en République démocratique du Congo. Plusieurs sources ont confirmé la présence de l'auditeur général des forces armées, le général Lucien-René Likulia Bakumi, parmi les victimes. Une enquête a été ouverte pour déterminer les circonstances de l'accident.",
      url: "https://www.jeuneafrique.com/",
      sourceId: "s13",
      dateInfo: "2026-10-02T11:00",
      cotationInfo: "2",
      informations: [
        { texte: "Dix-sept personnes ont péri le 25 septembre 2026 dans le crash d'un avion en République démocratique du Congo.", cotation: "2" },
        { texte: "Le général Lucien-René Likulia Bakumi, auditeur général des forces armées congolaises, figure parmi les victimes.", cotation: "2" },
      ],
    },
  ],
};

// Veille réelle « Actualité africaine » : sources et articles issus d'une recherche web du 3 octobre 2026
const VEILLE_AFRIQUE = {
  veilles: [
    { id: "v3", nom: "Actualité africaine", thematiques: "politique, économie, société — presse panafricaine et internationale", creeeLe: "2026-10-03" },
  ],
  sources: [
    { id: "s10", nom: "RFI Afrique", type: "ouverte", fiabilite: "B", description: "Rédaction dédiée au continent : Maghreb, Sahel, Afrique centrale et de l'Ouest", veilleId: "v3", url: "https://www.rfi.fr/fr/afrique/" },
    { id: "s11", nom: "Africanews", type: "ouverte", fiabilite: "C", description: "Chaîne panafricaine d'information en continu", veilleId: "v3", url: "https://fr.africanews.com/" },
    { id: "s12", nom: "BBC News Africa", type: "ouverte", fiabilite: "B", description: "Section Afrique de la BBC, correspondants sur le continent", veilleId: "v3", url: "https://www.bbc.com/news/world/africa" },
    { id: "s13", nom: "Jeune Afrique", type: "ouverte", fiabilite: "C", description: "Hebdomadaire panafricain, sources confirmées en local", veilleId: "v3", url: "https://www.jeuneafrique.com/" },
    { id: "s14", nom: "allAfrica.com", type: "ouverte", fiabilite: "C", description: "Agrégateur : plus de 600 dépêches quotidiennes de 90 organisations de presse africaines", veilleId: "v3", url: "https://allafrica.com/" },
    { id: "s15", nom: "La Presse (Québec) — Afrique", type: "ouverte", fiabilite: "B", description: "Section Afrique du quotidien québécois, dépêches d'agences", veilleId: "v3", url: "https://www.lapresse.ca/international/afrique/" },
  ],
  rapports: [
    {
      id: "r10", titre: "Afrique du Sud : double fusillade au Cap et à Johannesburg, 27 morts",
      contenu: "Huit hommes armés ont tué 17 personnes dans un bar de l'ouest de Johannesburg, puis dix autres ont été tuées dans un établissement nocturne du Cap, dans la nuit du 26 au 27 septembre. La police a lancé des chasses à l'homme avec des unités spéciales. Recoupé : RFI, France 24, franceinfo, TF1.",
      dateInfo: "2026-09-27T10:00", cotationInfo: "2", sourceId: "s12", veilleId: "v3", entitesIds: [],
      url: "https://www.bbc.com/news/world/africa",
      informations: [
        { texte: "27 morts au total : 17 à Johannesburg (bar, West Rand) et 10 au Cap (township).", cotation: "2" },
        { texte: "La violence armée et les rivalités entre gangs demeurent un fléau national en Afrique du Sud.", cotation: "2" },
      ],
    },
    {
      id: "r11", titre: "RDC : crash d'un avion à Kenge, 17 morts dont deux hauts responsables de la justice militaire",
      contenu: "Un avion de la compagnie TRACEP Congo Aviation s'est écrasé le 25 septembre à Kenge (Kwango). Bilan définitif : 17 morts, dont les lieutenants-généraux Joseph Mutombo Katalayi Tiende (Haute Cour militaire) et Lucien-René Likulia Bakumi (auditeur général des FARDC). Plusieurs enquêtes ouvertes. Recoupé : TV5MONDE, Atlasinfo, Cedar News.",
      dateInfo: "2026-09-26T10:00", cotationInfo: "2", sourceId: "s13", veilleId: "v3", entitesIds: [],
      url: "https://www.jeuneafrique.com/",
      informations: [
        { texte: "17 personnes ont péri dans le crash du 25 septembre à Kenge.", cotation: "2" },
        { texte: "L'auditeur général des forces armées figurait parmi les victimes.", cotation: "2" },
      ],
    },
    {
      id: "r12", titre: "Dakar : les Jeux olympiques de la jeunesse du 31 octobre au 13 novembre",
      contenu: "Les JOJ d'été se tiennent à Dakar, Diamniadio et Saly du 31 octobre au 13 novembre 2026 : première compétition olympique organisée sur le continent africain. Recoupé : site officiel du CIO (Dakar 2026), Wikipedia.",
      dateInfo: "2026-09-29T09:00", cotationInfo: "2", sourceId: "s13", veilleId: "v3", entitesIds: [],
      url: "https://www.jeuneafrique.com/",
      informations: [
        { texte: "Les JOJ se tiennent à Dakar du 31 octobre au 13 novembre 2026.", cotation: "2" },
        { texte: "Il s'agit de la première compétition olympique organisée en Afrique.", cotation: "2" },
      ],
    },
    {
      id: "r13", titre: "Kenya : Dangote lance une mégaraffinerie de 16 milliards de dollars à Lamu",
      contenu: "Aliko Dangote (homme le plus riche d'Afrique) et le président William Ruto ont posé la première pierre d'une raffinerie de 16 milliards de dollars à Lamu, le 30 septembre, en présence des dirigeants éthiopien et ougandais. Capacité prévue : 700 000 barils/jour. Recoupé : BBC News Afrique, New African, Connaissance des Énergies.",
      dateInfo: "2026-09-30T20:00", cotationInfo: "2", sourceId: "s11", veilleId: "v3", entitesIds: [],
      url: "https://fr.africanews.com/",
      informations: [
        { texte: "Raffinerie de 16 milliards de dollars à Lamu, sur la côte nord du Kenya, lancée le 30 septembre.", cotation: "2" },
        { texte: "Appel de Dangote à une prise en main économique du continent d'ici 2030.", cotation: "2" },
      ],
    },
    {
      id: "r14", titre: "RDC : l'épidémie d'Ebola dépasse 3 000 morts",
      contenu: "L'épidémie d'Ebola en RDC, la plus meurtrière jamais enregistrée dans le pays, a dépassé 3 000 morts selon l'Institut national de santé publique congolais ; 60 zones de santé touchées dans six provinces, essais cliniques de vaccins attendus dès octobre ou novembre. Recoupé : La Presse/AFP, La Libre, TVA/TF1.",
      dateInfo: "2026-09-24T18:00", cotationInfo: "2", sourceId: "s15", veilleId: "v3", entitesIds: [],
      url: "https://www.lapresse.ca/international/afrique/",
      informations: [
        { texte: "Plus de 3 000 morts dus à Ebola en RDC (chiffres officiels de l'INSP).", cotation: "2" },
        { texte: "Il s'agit de l'épidémie la plus meurtrière jamais enregistrée dans le pays.", cotation: "2" },
      ],
    },
    {
      id: "r15", titre: "Éthiopie : reprise des combats dans le Tigré depuis le 23 septembre",
      contenu: "Depuis le 23 septembre, les combats ont repris dans le nord de l'Éthiopie entre le gouvernement fédéral et les autorités du Tigré (TPLF) ; le TPLF s'est emparé des trois aéroports du Tigré, des combats ont été signalés en Amhara et Afar. L'Éthiopie et l'Érythrée ont rompu leurs relations diplomatiques. Recoupé : AFP, Africanews, Boursorama/AFP.",
      dateInfo: "2026-10-02T08:00", cotationInfo: "2", sourceId: "s11", veilleId: "v3", entitesIds: [],
      url: "https://fr.africanews.com/",
      informations: [
        { texte: "Les combats ont repris le 23 septembre dans le nord de l'Éthiopie (Tigré).", cotation: "2" },
        { texte: "Rupture des relations diplomatiques entre l'Éthiopie et l'Érythrée, craintes d'escalade régionale.", cotation: "2" },
        { texte: "Des dizaines de milliers de déplacés dans l'Afar selon des sources non vérifiées indépendamment.", cotation: "4" },
      ],
    },
  ],
};

function Badge({ children, couleur }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: (couleur || "#334155") + "22", color: couleur || "#334155" }}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "", style }) {
  return <div style={style} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

function BarreFiltres({ filtreTypes, setFiltreTypes, modeRang1, setModeRang1 }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Afficher :</span>
      <button onClick={() => setFiltreTypes(null)}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filtreTypes === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
        Tout
      </button>
      {TYPES_ENTITE.map((t) => (
        <button key={t.code} onClick={() => setFiltreTypes(filtreTypes === t.code ? null : t.code)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filtreTypes === t.code ? "text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          style={filtreTypes === t.code ? { backgroundColor: t.couleur } : {}}>
          {t.icone} {t.label}
        </button>
      ))}
      <button onClick={() => setFiltreTypes(filtreTypes === "liens" ? null : "liens")}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filtreTypes === "liens" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
        🔗 Entités liées
      </button>
      {setModeRang1 && (
        <button onClick={() => setModeRang1(!modeRang1)}
          className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold ${modeRang1 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          🎯 Rang 1 {modeRang1 ? "activé" : "désactivé"}
        </button>
      )}
    </div>
  );
}

function CotationBadge({ source, info }) {
  const f = source || "-";
  const i = info || "-";
  const couleurCotation = (f, i) => {
    const fv = "ABCDEF".indexOf(f);
    const iv = parseInt(i) - 1;
    if (fv < 0 || isNaN(iv) || iv < 0) return "#64748b";
    const score = (5 - fv) + (5 - iv);
    if (score >= 8) return "#16a34a";
    if (score >= 5) return "#ca8a04";
    if (score >= 2) return "#ea580c";
    return "#dc2626";
  };
  return (
    <Badge couleur={couleurCotation(f, i)}>
      {f}{i}
    </Badge>
  );
}

function GrapheRelationnel({ db, onSelect, selectedId, modeRang1 }) {
  const W = 900, H = 640;
  const [positions, setPositions] = useState({});
  const [dragId, setDragId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const svgRef = useRef(null);
  const movedRef = useRef(false);

  let entitesAff = db.entites;
  let liensAff = db.liens;
  if (modeRang1 && selectedId) {
    const voisins = new Set([selectedId]);
    db.liens.forEach((l) => {
      if (l.fromId === selectedId) voisins.add(l.toId);
      if (l.toId === selectedId) voisins.add(l.fromId);
    });
    entitesAff = db.entites.filter((e) => voisins.has(e.id));
    liensAff = db.liens.filter((l) => voisins.has(l.fromId) && voisins.has(l.toId));
  }

  const layoutInitial = () => {
    // spirale de phyllotaxie : espacement régulier entre tous les voisins, déterministe
    const pos = {};
    const angle = Math.PI * (3 - Math.sqrt(5));
    const espacement = 130;
    entitesAff.forEach((e, i) => {
      const r = i === 0 ? 0 : espacement * Math.sqrt(i);
      pos[e.id] = {
        x: W / 2 + Math.cos(angle * i) * r,
        y: H / 2 + Math.sin(angle * i) * r,
      };
    });
    return pos;
  };

  const ajusterVue = (pos) => {
    const vals = Object.values(pos);
    if (!vals.length) return;
    const minX = Math.min(...vals.map((p) => p.x)) - 60;
    const maxX = Math.max(...vals.map((p) => p.x)) + 60;
    const minY = Math.min(...vals.map((p) => p.y)) - 60;
    const maxY = Math.max(...vals.map((p) => p.y)) + 60;
    const z = Math.min(W / (maxX - minX), H / (maxY - minY), 1.4);
    const nz = Math.max(0.25, +z.toFixed(2));
    setZoom(nz);
    setPan({ x: -((minX + maxX) / 2) * nz + W / 2, y: -((minY + maxY) / 2) * nz + H / 2 });
  };

  useEffect(() => {
    const idSet = entitesAff.map((e) => e.id).join(",");
    const frais = layoutInitial();
    setPositions((prev) => {
      const next = {};
      entitesAff.forEach((e) => {
        next[e.id] = prev[e.id] || frais[e.id];
      });
      return next;
    });
    ajusterVue(frais);
  }, [entitesAff.map((e) => e.id).join(",")]);

  const coordonneesSvg = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = Math.min(W / rect.width, H / rect.height) * zoom;
    return {
      x: ((clientX - rect.left) / rect.width) * W / zoom - pan.x / zoom,
      y: ((clientY - rect.top) / rect.height) * H / zoom - pan.y / zoom,
    };
  };

  const onPointerMove = (ev) => {
    if (dragId) {
      const p = coordonneesSvg(ev.clientX, ev.clientY);
      movedRef.current = true;
      setPositions((prev) => ({ ...prev, [dragId]: { x: p.x, y: p.y } }));
      ev.preventDefault();
    } else if (dragStart) {
      const rect = svgRef.current.getBoundingClientRect();
      const scale = W / rect.width;
      setPan({
        x: dragStart.pan.x + (ev.clientX - dragStart.x) * scale,
        y: dragStart.pan.y + (ev.clientY - dragStart.y) * scale,
      });
    }
  };

  const finInteraction = () => {
    setDragId(null);
    setDragStart(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <button onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.2).toFixed(2)))} className="rounded-lg bg-slate-200 px-2.5 py-1 text-sm font-bold hover:bg-slate-300">−</button>
        <span className="w-12 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))} className="rounded-lg bg-slate-200 px-2.5 py-1 text-sm font-bold hover:bg-slate-300">+</button>
        <button onClick={() => ajusterVue(positions)} className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs hover:bg-slate-300">Recentrer</button>
        <button onClick={() => { const p = layoutInitial(); setPositions(p); ajusterVue(p); }} className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs hover:bg-slate-300">Réorganiser</button>
        <span className="ml-auto text-xs text-slate-400">Clic : fiche · Glisser un nœud : le déplacer (définitif) · Glisser le fond : naviguer</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-grab touch-none select-none"
        style={{ height: 640 }}
        onPointerDown={(ev) => { setDragStart({ x: ev.clientX, y: ev.clientY, pan }); }}
        onPointerMove={onPointerMove}
        onPointerUp={finInteraction}
        onPointerLeave={finInteraction}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {liensAff.filter((l) => positions[l.fromId] && positions[l.toId]).map((l) => {
            const a = positions[l.fromId], b = positions[l.toId];
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const actif = selectedId && (selectedId === l.fromId || selectedId === l.toId);
            return (
              <g key={l.id} pointerEvents="none">
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth={actif ? 2.5 : 1.4} />
                <text x={mx} y={my - 4} textAnchor="middle" fontSize="10" fill="#64748b">{l.nom ? l.nom + " (" + l.type + ")" : l.type}</text>
              </g>
            );
          })}
          {entitesAff.map((e) => {
            const p = positions[e.id];
            if (!p) return null;
            const sel = selectedId === e.id;
            return (
              <g
                key={e.id}
                transform={`translate(${p.x},${p.y})`}
                style={{ cursor: "pointer" }}
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  movedRef.current = false;
                  setDragStart(null);
                  setDragId(e.id);
                  ev.target.setPointerCapture && ev.target.setPointerCapture(ev.pointerId);
                }}
                onClick={() => { if (!movedRef.current) onSelect(e.id); }}
              >
                <circle r={sel ? 26 : 20} fill={couleurType(e.type)} fillOpacity={sel ? 0.95 : 0.85} stroke="#fff" strokeWidth="2" />
                <text textAnchor="middle" y="5" fontSize="14" fill="#fff">{iconeType(e.type)}</text>
                <text textAnchor="middle" y="40" fontSize="11" fontWeight="600" fill="#1e293b">
                  {(e.prenom ? e.prenom + " " : "") + e.nom}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white px-3 py-2">
        {TYPES_ENTITE.map((t) => (
          <Badge key={t.code} couleur={t.couleur}>{t.icone} {t.label}</Badge>
        ))}
      </div>
    </div>
  );
}

function FriseChronologique({ db, onSelect }) {
  const evenements = db.entites
    .filter((e) => e.type === "evenement" && e.dateHeure)
    .sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
  const rapports = db.rapports.filter((r) => r.dateInfo).sort((a, b) => a.dateInfo.localeCompare(b.dateInfo));

  const PointFrise = ({ date, titre, couleur, icone, onClick, badge }) => (
    <button onClick={onClick} className="group flex w-full gap-3 text-left">
      <div className="flex w-28 shrink-0 flex-col items-end pt-1 text-xs text-slate-500">{date}</div>
      <div className="relative flex flex-col items-center">
        <div className="absolute top-5 h-full w-px bg-slate-300 group-last:hidden" />
        <div className="z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-sm shadow"
          style={{ backgroundColor: couleur }}>{icone}</div>
      </div>
      <div className="pb-6">
        <div className="text-sm font-semibold text-slate-800 group-hover:underline">{titre}</div>
        {badge}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 font-semibold text-slate-800">Événements</h3>
        {evenements.length === 0 && <p className="text-sm text-slate-500">Aucun événement daté pour l'instant.</p>}
        <div className="flex flex-col">
          {evenements.map((e) => {
            const dt = e.dateHeure;
            const date = dt.slice(0, 10) + (dt.length > 10 ? " " + dt.slice(11, 16) : "");
            return (
              <PointFrise key={e.id} date={date} titre={e.nom} couleur={couleurType(e.type)} icone={iconeType(e.type)}
                onClick={() => onSelect(e.id)}
                badge={<div className="text-xs text-slate-500">{e.resume}</div>} />
            );
          })}
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 font-semibold text-slate-800">Informations collectées (rapports)</h3>
        <div className="flex flex-col">
          {rapports.map((r) => {
            const src = db.sources.find((s) => s.id === r.sourceId);
            const veilleRapport = db.veilles.find((v) => v.id === r.veilleId);
            return (
              <PointFrise key={r.id} date={r.dateInfo.replace("T", " ").slice(0, 16)} titre={r.titre} couleur="#475569" icone="📄"
                onClick={() => {}}
                badge={<div className="flex flex-wrap items-center gap-1"><CotationBadge source={src ? src.fiabilite : undefined} info={r.cotationInfo} />{veilleRapport && <span className="text-xs text-slate-500">🔎 {veilleRapport.nom}</span>}</div>} />
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// Carte embarquée hors ligne : contours continentaux simplifiés (projection équirectangulaire).
// Mode Plan (carte claire) et mode Satellite (fond sombre style imagerie). Aucune dépendance réseau.
const CONTINENTS = [
  // Afrique
  [[-6,35],[10,37],[11,34],[15,32],[20,32],[25,32],[31,31],[32,31],[35,28],[36,25],[38,21],[40,16],[43,11],[45,11],[51,12],[51,10],[48,5],[44,1],[41,-2],[40,-6],[40,-10],[37,-14],[35,-19],[35,-23],[33,-26],[30,-31],[27,-34],[20,-35],[18,-33],[15,-27],[12,-18],[13,-12],[12,-6],[9,-1],[9,3],[6,4],[3,6],[-1,5],[-4,5],[-8,4],[-13,8],[-17,14],[-16,20],[-14,24],[-10,29],[-9,32],[-6,35]],
  // Eurasie (Europe + Asie, façade méditerranéenne simplifiée)
  [[-6,36],[-9,38],[-9,43],[-2,44],[-2,47],[-5,48],[-1,50],[3,51],[7,54],[9,57],[5,59],[5,62],[10,64],[14,67],[18,69],[24,71],[31,70],[33,67],[40,66],[44,66],[44,68],[48,69],[55,69],[60,70],[68,73],[76,73],[80,73],[90,75],[100,77],[110,76],[120,73],[130,72],[140,73],[150,70],[160,70],[170,67],[178,66],[173,61],[165,60],[160,53],[155,51],[152,59],[142,54],[137,49],[133,43],[130,42],[126,35],[122,30],[120,24],[112,21],[108,15],[105,10],[103,1],[100,3],[98,8],[94,16],[91,22],[87,21],[84,18],[80,13],[78,8],[74,13],[71,19],[68,24],[63,25],[57,27],[51,24],[57,24],[59,22],[57,19],[53,17],[49,14],[45,12],[43,13],[39,17],[38,22],[36,26],[34,28],[35,31],[36,34],[36,36],[34,36],[30,36],[27,37],[26,39],[24,38],[22,40],[19,42],[16,44],[13,44],[10,44],[7,43],[3,42],[0,40],[-2,37],[-6,36]],
  // Amérique du Nord
  [[-166,66],[-160,58],[-152,58],[-145,60],[-135,57],[-130,54],[-124,48],[-124,40],[-118,33],[-114,29],[-110,23],[-105,19],[-96,15],[-92,15],[-87,21],[-90,21],[-97,25],[-97,29],[-90,29],[-84,30],[-81,25],[-80,32],[-76,35],[-74,40],[-70,42],[-66,45],[-60,47],[-55,52],[-58,55],[-62,58],[-70,60],[-78,62],[-85,66],[-95,68],[-105,69],[-115,69],[-125,70],[-135,70],[-145,70],[-155,71],[-162,70],[-166,68],[-166,66]],
  // Amérique du Sud
  [[-81,0],[-80,-3],[-76,-7],[-71,-14],[-70,-18],[-72,-24],[-71,-30],[-73,-37],[-74,-44],[-74,-50],[-68,-55],[-66,-55],[-65,-47],[-62,-40],[-57,-35],[-53,-34],[-48,-28],[-42,-23],[-39,-16],[-35,-8],[-38,-5],[-44,-3],[-50,0],[-52,4],[-55,6],[-60,8],[-64,10],[-70,12],[-75,9],[-78,8],[-80,1],[-81,0]],
  // Australie
  [[114,-22],[113,-26],[115,-34],[118,-35],[124,-33],[129,-32],[133,-32],[136,-35],[139,-36],[143,-39],[147,-38],[150,-37],[153,-32],[153,-28],[151,-24],[146,-19],[143,-14],[142,-11],[140,-17],[136,-15],[136,-12],[130,-12],[125,-14],[122,-17],[118,-20],[114,-22]],
  // Groenland
  [[-52,60],[-53,66],[-55,70],[-60,74],[-58,77],[-50,80],[-38,82],[-25,82],[-20,79],[-22,73],[-30,68],[-40,64],[-46,60],[-52,60]],
  // Madagascar
  [[44,-12],[49,-13],[50,-16],[49,-20],[47,-24],[44,-25],[43,-22],[44,-17],[44,-12]],
  // Japon
  [[130,31],[132,34],[136,34],[140,35],[141,39],[141,41],[143,43],[145,44],[142,45],[139,41],[137,37],[133,35],[130,33],[130,31]],
  // Royaume-Uni
  [[-5,50],[-4,53],[-5,56],[-3,58],[-1,57],[0,53],[1,51],[-5,50]],
  // Antarctique (bande jusqu'au pôle Sud)
  [[-180,-72],[-160,-78],[-140,-75],[-120,-74],[-100,-74],[-80,-72],[-62,-64],[-58,-64],[-40,-77],[-20,-71],[0,-70],[20,-70],[45,-67],[70,-68],[90,-66],[120,-66],[150,-69],[170,-71],[180,-72],[180,-90],[-180,-90],[-180,-72]],
].map((pts) => pts.map(([lng, lat]) => [lng, lat]));

// Carte : modes Plan (vectoriel embarqué), Satellite (vectoriel embarqué) et En ligne (tuiles réelles, repli si réseau bloqué)
const TUILES = {
  plan: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  satellite: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

function VueCarte({ db, onSelect }) {
  // Espace svg monde : 720 x 360 unités (1 unité = 0,5°) ; équirectangulaire
  const sx = (lng) => (lng + 180) * 2;
  const sy = (lat) => (90 - lat) * 2;
  const lieux = db.entites.filter((e) => e.type === "lieu" && e.latitude && e.longitude);
  const hasData = lieux.length > 0;

  const [mode, setMode] = useState("plan");
  const [vue, setVue] = useState({ x: sx(20), y: sy(20), z: 2 });
  const [drag, setDrag] = useState(null);
  const contRef = useRef(null);
  // Suivi multi-touch : 1 doigt = glisser, 2 doigts = pincement (zoom)
  const pincementRef = useRef(null);
  const pointeursRef = useRef(new Map());
  const [enLigneKO, setEnLigneKO] = useState(false);

  const cleDonnees = db.entites.map((e) => e.id + (e.latitude || "")).join(",");
  const recentrer = () => {
    if (!hasData) { setVue({ x: sx(20), y: sy(20), z: 1 }); return; }
    const xs = lieux.map((l) => sx(parseFloat(l.longitude)));
    const ys = lieux.map((l) => sy(parseFloat(l.latitude)));
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const z = Math.max(1, Math.min(10, Math.min(720 / Math.max(maxX - minX, 40), 360 / Math.max(maxY - minY, 40))));
    setVue({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, z });
  };
  useEffect(recentrer, [cleDonnees]);

  const pos = (lat, lng) => ({
    x: 360 + (sx(lng) - vue.x) * vue.z,
    y: 180 + (sy(lat) - vue.y) * vue.z,
  });

  const onPointerDown = (ev) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    pointeursRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointeursRef.current.size === 2) {
      // Deux doigts posés : mémorise l'état de départ du pincement
      const [a, b] = [...pointeursRef.current.values()];
      const rect = contRef.current ? contRef.current.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
      pincementRef.current = {
        vue,
        dist: Math.max(10, Math.hypot(b.x - a.x, b.y - a.y)),
        mx: ((a.x + b.x) / 2 - rect.left) / rect.width,
        my: ((a.y + b.y) / 2 - rect.top) / rect.height,
      };
      setDrag(null);
    } else {
      setDrag({ px: ev.clientX, py: ev.clientY, vue });
    }
  };
  const onPointerMove = (ev) => {
    if (!pointeursRef.current.has(ev.pointerId)) return;
    pointeursRef.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointeursRef.current.size >= 2 && pincementRef.current) {
      // Pincement : zoom centré sur le milieu des deux doigts
      const [a, b] = [...pointeursRef.current.values()];
      const rect = contRef.current ? contRef.current.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
      const p = pincementRef.current;
      const dist = Math.max(10, Math.hypot(b.x - a.x, b.y - a.y));
      const ux = p.mx * 720, uy = p.my * 360;
      const cx = (ux - 360) / p.vue.z + p.vue.x;
      const cy = (uy - 180) / p.vue.z + p.vue.y;
      setVue({
        x: cx - (p.mx - 0.5) * 720 / p.vue.z * (p.dist / dist),
        y: cy - (p.my - 0.5) * 360 / p.vue.z * (p.dist / dist),
        z: Math.max(0.8, Math.min(14, p.vue.z * (dist / p.dist))),
      });
      return;
    }
    if (!drag || !contRef.current) return;
    const rect = contRef.current.getBoundingClientRect();
    const f = 720 / rect.width / vue.z;
    setVue({ ...drag.vue, x: drag.vue.x - (ev.clientX - drag.px) * f, y: drag.vue.y - (ev.clientY - drag.py) * f });
  };
  const onPointerUp = (ev) => {
    pointeursRef.current.delete(ev.pointerId);
    if (pointeursRef.current.size < 2) pincementRef.current = null;
    if (pointeursRef.current.size === 1) {
      // Retour à un seul doigt : redémarre le glisser depuis la position actuelle
      const restant = [...pointeursRef.current.values()][0];
      setDrag({ px: restant.x, py: restant.y, vue });
    } else {
      setDrag(null);
    }
  };

  // Zoom molette centré sur le curseur
  const onWheel = (ev) => {
    if (!contRef.current) return;
    ev.preventDefault();
    const rect = contRef.current.getBoundingClientRect();
    // position du curseur en unités carte (0..720 / 0..360)
    const ux = (ev.clientX - rect.left) / rect.width * 720;
    const uy = (ev.clientY - rect.top) / rect.height * 360;
    const facteur = ev.deltaY < 0 ? 1.3 : 1 / 1.3;
    setVue((v) => {
      const z = Math.max(0.8, Math.min(14, v.z * facteur));
      // point carte sous le curseur avant zoom
      const cx = (ux - 360) / v.z + v.x;
      const cy = (uy - 180) / v.z + v.y;
      // après zoom, garder ce point sous le curseur
      return { z, x: cx - (ux - 360) / z, y: cy - (uy - 180) / z };
    });
  };

  const couleurs = mode === "satellite"
    ? { ocean: "#081426", terre: "#1f3d20", terreBord: "#37552f", grille: "#13253f", texte: "#e2e8f0", marqueur: "#4ade80" }
    : { ocean: "#cfe9f5", terre: "#e3e8d4", terreBord: "#9aa883", grille: "#a8c2cc", texte: "#1e293b", marqueur: "#16a34a" };

  // Mode en ligne : conversion équirectangulaire → tuiles Web Mercator (écart < ~0,5 % hors pôles)
  const latM = (lat) => {
    const cl = Math.max(-85, Math.min(85, parseFloat(lat)));
    return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (cl * Math.PI) / 360));
  };
  const tuilesEnLigne = (() => {
    if (mode !== "enLigne") return [];
    const n = Math.pow(2, 12); // zoom 12 en Mercator ≈ vue.z = 4
    const cx = ((vue.x / 2 - 90 + 180) / 360) * n;
    const latC = 90 - vue.y / 2;
    const cy = ((1 - Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, latC)) * Math.PI) / 360)) / Math.PI) / 2) * n;
    const tz = Math.max(1, Math.min(12, Math.round(Math.log2(vue.z) + 1)));
    const n2 = Math.pow(2, tz);
    const cx2 = ((vue.x / 2 - 90 + 180) / 360) * n2;
    const cy2 = ((1 - Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, latC)) * Math.PI) / 360)) / Math.PI) / 2) * n2;
    // nombre de tuiles pour couvrir l'écran : chaque tuile = 256 px ; l'écran ≈ 720*z unités ≈ largeur
    const nbX = Math.ceil(720 * vue.z / 256 / 2) + 2;
    const nbY = Math.ceil(360 * vue.z / 256 / 2) + 2;
    const out = [];
    void cx; void cy; void n;
    for (let dx = -nbX; dx <= nbX; dx++) {
      for (let dy = -nbY; dy <= nbY; dy++) {
        const tx = Math.floor(cx2) + dx, ty = Math.floor(cy2) + dy;
        if (ty < 0 || ty >= n2) continue;
        const xr = ((tx % n2) + n2) % n2;
        out.push({
          key: `${tz}-${xr}-${ty}`,
          src: TUILES.satellite(tz, xr, ty),
          left: 360 + (tx - cx2) * 256 / vue.z * 2,
          top: 180 + (ty - cy2) * 256 / vue.z * 2,
          size: 256 / vue.z * 2,
        });
      }
    }
    return out.slice(0, 80); // garde-fou
  })();

  const marqueurs = lieux.map((l) => ({ e: l, p: pos(parseFloat(l.latitude), parseFloat(l.longitude)) }));
  const points = Object.fromEntries(marqueurs.map((m) => [m.e.id, m.p]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Fond de carte :</span>
        <button onClick={() => setMode("plan")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "plan" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>🗺️ Plan</button>
        <button onClick={() => setMode("satellite")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "satellite" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>🛰️ Satellite</button>
        <button onClick={() => { setMode(mode === "enLigne" ? "plan" : "enLigne"); setEnLigneKO(false); }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === "enLigne" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          🌐 En ligne {mode === "enLigne" ? "(imagerie réelle)" : ""}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setVue((v) => ({ ...v, z: Math.max(0.8, v.z / 1.4) }))} className="rounded-lg bg-slate-200 px-2.5 py-1 text-sm font-bold hover:bg-slate-300">−</button>
          <span className="w-10 text-center text-xs text-slate-500">×{vue.z.toFixed(1)}</span>
          <button onClick={() => setVue((v) => ({ ...v, z: Math.min(14, v.z * 1.4) }))} className="rounded-lg bg-slate-200 px-2.5 py-1 text-sm font-bold hover:bg-slate-300">+</button>
          <button onClick={recentrer} className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs hover:bg-slate-300">Recentrer sur les données</button>
        </div>
      </div>
      <div
        ref={contRef}
        className="relative w-full overflow-hidden rounded-xl border border-slate-300"
        style={{ aspectRatio: "2 / 1", maxHeight: 560, cursor: drag ? "grabbing" : "grab", touchAction: "none", backgroundColor: couleurs.ocean }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => { pointeursRef.current.clear(); pincementRef.current = null; setDrag(null); }}
        onWheel={onWheel}
      >
        {mode === "enLigne" && !enLigneKO && tuilesEnLigne.map((t) => (
          <img key={t.key} src={t.src} alt="" draggable={false} className="pointer-events-none absolute"
            style={{ left: t.left, top: t.top, width: t.size, height: t.size }}
            onError={() => setEnLigneKO(true)} />
        ))}
        {mode === "enLigne" && enLigneKO && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 p-6 text-center">
            <p className="max-w-md rounded-lg bg-white px-4 py-3 text-sm text-slate-700">
              Imagerie en ligne inaccessible : le réseau est bloqué dans cet environnement.
              Basculez sur le mode 🛰️ Satellite (fond embarqué) — le contenu de la carte reste identique.
            </p>
          </div>
        )}
        {mode !== "enLigne" && (
          <svg viewBox="0 0 720 360" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <g transform={`translate(${360 - vue.x * vue.z} ${180 - vue.y * vue.z}) scale(${vue.z})`}>
            {/* graticule tous les 30° */}
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => (
              <line key={"g" + lng} x1={sx(lng)} y1={0} x2={sx(lng)} y2={360} stroke={couleurs.grille} strokeWidth={0.3} />
            ))}
            {[-60, -30, 0, 30, 60].map((lat) => (
              <line key={"p" + lat} x1={0} y1={sy(lat)} x2={720} y2={sy(lat)} stroke={couleurs.grille} strokeWidth={0.3} />
            ))}
            {/* équateur plus visible */}
            <line x1={0} y1={sy(0)} x2={720} y2={sy(0)} stroke={couleurs.grille} strokeWidth={0.6} strokeDasharray="4 2" />
            {/* continents */}
            {CONTINENTS.map((pts, i) => (
              <polygon key={i} points={pts.map(([lng, lat]) => `${sx(lng)},${sy(lat)}`).join(" ")}
                fill={couleurs.terre} stroke={couleurs.terreBord} strokeWidth={0.3} />
            ))}
          </g>
        </svg>
        )}
        {/* calque données : liens + marqueurs (projection exacte des coordonnées) */}
        <svg viewBox="0 0 720 360" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {db.liens.map((l) => {
            const a = points[l.fromId], b = points[l.toId];
            if (!a || !b) return null;
            return <line key={l.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#38bdf8" strokeWidth={0.8} strokeDasharray="3 2" opacity="0.9" />;
          })}
          {marqueurs.map(({ e, p }) => (
            <g key={e.id} style={{ cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); onSelect(e.id); }}>
              <circle cx={p.x} cy={p.y} r={5} fill={couleurs.marqueur} fillOpacity={0.25} />
              <circle cx={p.x} cy={p.y} r={2.5} fill={couleurs.marqueur} stroke="#fff" strokeWidth={0.6} />
              <text x={p.x + 4} y={p.y - 3} fontSize={6} fontWeight="600" fill={couleurs.texte}
                stroke={mode === "plan" ? "none" : "#000"} strokeWidth={mode === "plan" ? 0 : 0.4} paintOrder="stroke">{e.nom}</text>
            </g>
          ))}
          {!hasData && (
            <text x={360} y={180} textAnchor="middle" fontSize={12} fill={couleurs.texte}>
              {db.entites.length > 0
                ? "Aucun lieu visible avec le filtre actif : cliquez sur « Tout » ou filtrez sur les lieux."
                : "Ajoutez des lieux avec latitude / longitude pour les visualiser."}
            </text>
          )}
        </svg>
        <div className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-slate-400">
          Carte de situation simplifiée, embarquée hors ligne · Projection équirectangulaire
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Mode Plan : fond clair ; mode Satellite : fond sombre style imagerie ; mode En ligne : imagerie satellite réelle si le réseau est accessible.
        Navigation à la souris : glissez pour déplacer, molette pour zoomer (centré sur le curseur), boutons − / + et « Recentrer sur les données ».
        Les lignes pointillées représentent les liens entre lieux géolocalisés ; un clic sur un marqueur ouvre la fiche de l'entité.
        Les contours vectoriels sont simplifiés : la position des marqueurs, elle, est exacte.
      </p>
    </div>
  );
}

function FicheEntite({ entite, db, onClose, onEdit, onFusionDoublon }) {
  const [modeDoublon, setModeDoublon] = useState(false);
  const [cibleChoisie, setCibleChoisie] = useState("");
  const liens = db.liens.filter((l) => l.fromId === entite.id || l.toId === entite.id);
  const rapports = db.rapports.filter((r) => r.entitesIds.includes(entite.id));
  const t = TYPES_ENTITE.find((x) => x.code === entite.type);
  // Candidats doublons : même type et nom similaire (Jaccard), ou nom contenu dans l'autre
  const candidats = db.entites
    .filter((e) => e.id !== entite.id && e.type === entite.type)
    .map((e) => {
      const sim = similarite(e.nom, entite.nom);
      const inclus = e.nom.toLowerCase().includes(entite.nom.toLowerCase()) || entite.nom.toLowerCase().includes(e.nom.toLowerCase());
      return { e, sim: Math.max(sim, inclus ? 0.8 : 0) };
    })
    .filter((c) => c.sim >= 0.5)
    .sort((a, b) => b.sim - a.sim);
  return (
    <Card className="border-l-4" style={{ borderLeftColor: couleurType(entite.type) }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge couleur={couleurType(entite.type)}>{t ? t.icone : ""} {t ? t.label : ""}</Badge>
          </div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            {entite.prenom && entite.type === "personne" ? `${entite.prenom} ` : ""}{entite.nom}
          </h3>
        </div>
        <div className="flex gap-2">
          {onFusionDoublon && (
            <button onClick={() => { setModeDoublon(!modeDoublon); setCibleChoisie(""); }}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
              title="Fusionner cette entité avec un doublon">♻️ Doublon</button>
          )}
          <button onClick={onEdit} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Modifier</button>
          <button onClick={onClose} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300">Fermer</button>
        </div>
      </div>
      {modeDoublon && onFusionDoublon && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">♻️ Fusionner avec un doublon</h4>
          <p className="mb-2 text-xs text-amber-800">L'entité choisie absorbe la fiche courante : rapports, liens et champs vides sont reportés, puis la fiche courante est supprimée.</p>
          {candidats.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {candidats.map(({ e, sim }) => (
                <button key={e.id} onClick={() => { onFusionDoublon(e.id, entite.id); setModeDoublon(false); }}
                  className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-100">
                  {iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}
                  <span className="ml-1 text-amber-600">· {Math.round(sim * 100)} %</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select className={inputCls} style={{ maxWidth: 300 }} value={cibleChoisie} onChange={(ev) => setCibleChoisie(ev.target.value)}>
              <option value="">… ou choisir une autre entité du même type</option>
              {db.entites.filter((e) => e.id !== entite.id && e.type === entite.type).map((e) => (
                <option key={e.id} value={e.id}>{iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}</option>
              ))}
            </select>
            <button disabled={!cibleChoisie} onClick={() => { onFusionDoublon(cibleChoisie, entite.id); setModeDoublon(false); }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">Fusionner</button>
            <button onClick={() => setModeDoublon(false)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-300">Annuler</button>
          </div>
          {candidats.length === 0 && <p className="mt-2 text-xs text-amber-700">Aucun doublon évident détecté pour « {entite.nom} » — sélectionnez manuellement l'entité à fusionner.</p>}
        </div>
      )}
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {entite.resume && <p><span className="font-semibold">Résumé :</span> {entite.resume}</p>}
        {entite.type === "evenement" && (
          <>
            <p><span className="font-semibold">Date et heure :</span> {entite.dateHeure.replace("T", " ")}</p>
            {entite.lieu && <p><span className="font-semibold">Lieu :</span> {entite.lieu}</p>}
          </>
        )}
        {entite.type === "personne" && entite.biographie && <p><span className="font-semibold">Biographie :</span> {entite.biographie}</p>}
        {entite.type === "lieu" && (entite.latitude || entite.longitude) && (
          <p><span className="font-semibold">Coordonnées :</span> {entite.latitude}°, {entite.longitude}°</p>
        )}
        {entite.description && <p><span className="font-semibold">Description :</span> {entite.description}</p>}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Liens ({liens.length})</h4>
          <ul className="space-y-1 text-sm">
            {liens.map((l) => {
              const autre = l.fromId === entite.id ? db.entites.find((e) => e.id === l.toId) : db.entites.find((e) => e.id === l.fromId);
              if (!autre) return null;
              const sens = l.fromId === entite.id ? `${l.type}${l.nom ? " « " + l.nom + " »" : ""} →` : `← ${l.type}${l.nom ? " « " + l.nom + " »" : ""}`;
              return (
                <li key={l.id} className="text-slate-700">
                  {sens} <span className="font-medium">{iconeType(autre.type)} {autre.prenom ? autre.prenom + " " : ""}{autre.nom}</span>
                  {l.commentaire && <span className="text-slate-400"> ({l.commentaire})</span>}
                </li>
              );
            })}
            {liens.length === 0 && <li className="text-slate-400">Aucun lien.</li>}
          </ul>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Sources / rapports ({rapports.length})</h4>
          <ul className="space-y-1 text-sm">
            {rapports.map((r) => {
              const src = db.sources.find((s) => s.id === r.sourceId);
              const veilleRapport = db.veilles.find((v) => v.id === r.veilleId);
              return (
                <li key={r.id} className="text-slate-700">
                  <span className="font-medium">{r.titre}</span>{" "}
                  <CotationBadge source={src ? src.fiabilite : undefined} info={r.cotationInfo} />{" "}
                  {src && <span className="text-xs text-slate-400">— {src.nom}</span>}
                  {veilleRapport && <span className="text-xs text-slate-400"> · 🔎 {veilleRapport.nom}</span>}
                </li>
              );
            })}
            {rapports.length === 0 && <li className="text-slate-400">Aucun rapport rattaché.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}

const MOTS_EXCLUS = new Set(["La","Le","Les","Une","Un","Des","De","Du","Selon","Après","Dans","Depuis","Parmi","Pour","Ces","Cette","Avec","Sur","En","Au","Aux","Par","Plus","Deux","Trois","Dix","Sept","Vendredi","Samedi","Dimanche","Lundi","Mardi","Mercredi","Jeudi","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre","Il","Elle","Ils","Elles","Mais","Or","Donc","Car","Si","Afrique"]);

const GAZETTIER = [
  { nom: "Afrique du Sud", type: "lieu", lat: "-30.5595", lng: "22.9375" },
  { nom: "Johannesburg", type: "lieu", lat: "-26.2041", lng: "28.0473" },
  { nom: "Le Cap", type: "lieu", lat: "-33.9249", lng: "18.4241" },
  { nom: "RDC", type: "lieu", lat: "-4.0383", lng: "21.7587" },
  { nom: "République démocratique du Congo", type: "lieu", lat: "-4.0383", lng: "21.7587" },
  { nom: "Kinshasa", type: "lieu", lat: "-4.4419", lng: "15.2663" },
  { nom: "Kenge", type: "lieu", lat: "-4.8345", lng: "17.1268" },
  { nom: "Kwango", type: "lieu", lat: "-5.0000", lng: "17.0000" },
  { nom: "Beni", type: "lieu", lat: "0.4936", lng: "29.6014" },
  { nom: "Nord-Kivu", type: "lieu", lat: "0.5786", lng: "29.3820" },
  { nom: "Kenya", type: "lieu", lat: "0.0236", lng: "37.9062" },
  { nom: "Lamu", type: "lieu", lat: "-2.2717", lng: "40.9022" },
  { nom: "Nairobi", type: "lieu", lat: "-1.2921", lng: "36.8219" },
  { nom: "Dakar", type: "lieu", lat: "14.7167", lng: "-17.4677" },
  { nom: "Sénégal", type: "lieu", lat: "14.4974", lng: "-14.4524" },
  { nom: "Diamniadio", type: "lieu", lat: "14.7333", lng: "-17.2583" },
  { nom: "Saly", type: "lieu", lat: "14.4425", lng: "-17.0089" },
  { nom: "Éthiopie", type: "lieu", lat: "9.1450", lng: "40.4897" },
  { nom: "Tigré", type: "lieu", lat: "13.8333", lng: "39.1000" },
  { nom: "Amhara", type: "lieu", lat: "11.6000", lng: "38.3000" },
  { nom: "Afar", type: "lieu", lat: "12.0000", lng: "41.0000" },
  { nom: "Érythrée", type: "lieu", lat: "15.1794", lng: "39.7823" },
  { nom: "Addis-Abeba", type: "lieu", lat: "9.0320", lng: "38.7469" },
  { nom: "Addis Abeba", type: "lieu", lat: "9.0320", lng: "38.7469" },
  { nom: "Mekelle", type: "lieu", lat: "13.4967", lng: "39.4753" },
  { nom: "Sekota", type: "lieu", lat: "12.8667", lng: "39.0333" },
  { nom: "Alamata", type: "lieu", lat: "12.4167", lng: "39.5333" },
  { nom: "Nigeria", type: "lieu", lat: "9.0820", lng: "8.6753" },
  { nom: "Lagos", type: "lieu", lat: "6.5244", lng: "3.3792" },
  { nom: "Congo", type: "lieu", lat: "-4.0383", lng: "21.7587" },
  { nom: "Ouganda", type: "lieu", lat: "1.3733", lng: "32.2903" },
  { nom: "Somalie", type: "lieu", lat: "5.1521", lng: "46.1996" },
  { nom: "Soudan", type: "lieu", lat: "12.8628", lng: "30.2176" },
  { nom: "Maroc", type: "lieu", lat: "31.7917", lng: "-7.0926" },
  { nom: "Algérie", type: "lieu", lat: "28.0339", lng: "1.6596" },
  { nom: "Tunisie", type: "lieu", lat: "33.8869", lng: "9.5375" },
  { nom: "Mali", type: "lieu", lat: "17.5707", lng: "-3.9962" },
  { nom: "Burkina Faso", type: "lieu", lat: "12.2383", lng: "-1.5616" },
  { nom: "Niger", type: "lieu", lat: "17.6078", lng: "8.0817" },
  { nom: "Tchad", type: "lieu", lat: "15.4542", lng: "18.7322" },
  { nom: "Cameroun", type: "lieu", lat: "7.3697", lng: "12.3547" },
  { nom: "Côte d'Ivoire", type: "lieu", lat: "7.5400", lng: "-5.5471" },
  { nom: "Ghana", type: "lieu", lat: "7.9465", lng: "-1.0232" },
  { nom: "Tanzanie", type: "lieu", lat: "-6.3690", lng: "34.8888" },
  { nom: "Rwanda", type: "lieu", lat: "-1.9403", lng: "29.8739" },
  { nom: "Burundi", type: "lieu", lat: "-3.3731", lng: "29.9189" },
  { nom: "Zambie", type: "lieu", lat: "-13.1339", lng: "27.8493" },
  { nom: "Zimbabwe", type: "lieu", lat: "-19.0154", lng: "29.1549" },
  { nom: "Mozambique", type: "lieu", lat: "-18.6657", lng: "35.5296" },
  { nom: "Angola", type: "lieu", lat: "-11.2027", lng: "17.8739" },
  { nom: "Namibie", type: "lieu", lat: "-22.9576", lng: "18.4904" },
  { nom: "Botswana", type: "lieu", lat: "-22.3285", lng: "24.6849" },
  { nom: "Madagascar", type: "lieu", lat: "-18.7669", lng: "46.8691" },
  { nom: "Maurice", type: "lieu", lat: "-20.3484", lng: "57.5522" },
  { nom: "Mogadiscio", type: "lieu", lat: "2.0469", lng: "45.3182" },
  { nom: "Khartoum", type: "lieu", lat: "15.5007", lng: "32.5599" },
  { nom: "Abuja", type: "lieu", lat: "9.0765", lng: "7.3986" },
  { nom: "Kampala", type: "lieu", lat: "0.3476", lng: "32.5825" },
  { nom: "Varsovie", type: "lieu", lat: "52.2297", lng: "21.0122" },
];

function GAZETTIER_TROUVER(nom) {
  const n = nom.trim().toLowerCase();
  return GAZETTIER.find((g) => g.nom.toLowerCase() === n) || GAZETTIER.find((g) => g.nom.toLowerCase().includes(n) || n.includes(g.nom.toLowerCase()));
}

const MOTS_ORGANISATION = ["groupe", "ministère", "armée", "conseil", "cour", "organisation", "entreprise", "compagnie", "agence", "banque", "fédéral", "forces", "police", "tracep"];

// Scanner partagé : détecte dans un texte les candidats (guillemets, gazetier, séquences capitalisées)
function scannerTexte(texte, ajouter) {
  let m; const reGuillemets = /«\s*([^»]{3,60}?)\s*»/g;
  while ((m = reGuillemets.exec(texte))) {
    ajouter(m[1].trim(), "organisation", m[0]);
  }
  GAZETTIER.forEach((g) => {
    if (texte.includes(g.nom)) ajouter(g.nom, g.type, g.nom);
  });
  const mots = texte.split(/[^A-Za-zÀ-ÿ''-]+/);
  let run = [];
  const flush = () => {
    if (run.length >= 2) {
      const nom = run.join(" ");
      const lower = nom.toLowerCase();
      const type = MOTS_ORGANISATION.some((k) => lower.includes(k)) ? "organisation" : "personne";
      ajouter(nom, type, nom);
    }
    run = [];
  };
  mots.forEach((mot) => {
    if (!mot) return;
    if (MOTS_EXCLUS.has(mot)) { flush(); return; }
    const capitalise = /^[A-ZÉÈÀÂÎÔÛÆŒ]/.test(mot) && mot.length > 2;
    const connecteur = /^(de|du|des|d'|l'|la|le|les|of|the)$/i.test(mot);
    if (capitalise) { run.push(mot); return; }
    if (connecteur && run.length > 0) { run.push(mot); return; }
    flush();
  });
  flush();
}

function faireAjouter(db, cands, vus) {
  const existants = new Set(db.entites.map((e) => (e.prenom ? e.prenom + " " + e.nom : e.nom).toLowerCase()));
  return (nom, type, contexte) => {
    if (!nom) return null;
    const cle = nom.toLowerCase();
    if (vus.has(cle)) return null;
    if (existants.has(cle)) return null;
    if (nom.length < 4) return null;
    vus.add(cle);
    const c = { nom, type, contexte };
    cands.push(c);
    return c;
  };
}

function extraireCandidats(db) {
  const rejets = new Set(db.rejets || []);
  const cands = [];
  const vus = new Set();
  const ajouter = (nom, type, rapportId, rapportTitre, contexte) => {
    const cle = rapportId + "|" + nom.toLowerCase();
    if (rejets.has(cle)) return;
    const c = faireAjouter(db, cands, vus)(nom, type, contexte);
    if (c) { c.rapportId = rapportId; c.rapportTitre = rapportTitre; c.cle = cle; }
  };
  db.rapports.forEach((r) => {
    const texteComplet = [r.titre, r.contenu, ...(r.informations || []).map((i) => i.texte)].join(" . ");
    scannerTexte(texteComplet, (nom, type, contexte) => ajouter(nom, type, r.id, r.titre, contexte));
  });
  return cands;
}

// Candidats impliqués dans une information individuelle (personnes, lieux, organisations, matériel)
function extraireCandidatsInfo(db, rapport, texte) {
  if (!texte) return [];
  const rejets = new Set(db.rejets || []);
  const cands = [];
  const vus = new Set();
  scannerTexte(texte, (nom, type, contexte) => {
    const cle = rapport.id + "|" + nom.toLowerCase();
    if (rejets.has(cle)) return;
    const c = faireAjouter(db, cands, vus)(nom, type, contexte);
    if (c) { c.rapportId = rapport.id; c.rapportTitre = rapport.titre; c.cle = cle; }
  });
  return cands;
}

// Découpe un texte en segments, candidats surlignés
function segmenterTexte(texte, cands) {
  if (!texte) return [];
  const items = (cands || [])
    .filter((c) => texte.includes(c.nom))
    .map((c) => ({ c, idx: texte.indexOf(c.nom) }))
    .sort((a, b) => a.idx - b.idx);
  const out = [];
  let cur = 0;
  items.forEach(({ c, idx }) => {
    if (idx < cur) return;
    if (idx > cur) out.push({ texte: texte.slice(cur, idx) });
    out.push({ cand: c });
    cur = idx + c.nom.length;
  });
  if (cur < texte.length) out.push({ texte: texte.slice(cur) });
  return out;
}

// Durées de rétention proposées (en jours) ; 0 = illimitée
const RETENTIONS = [
  { jours: 7, label: "7 jours" },
  { jours: 14, label: "14 jours" },
  { jours: 30, label: "30 jours" },
  { jours: 90, label: "3 mois" },
  { jours: 365, label: "1 an" },
  { jours: 0, label: "Illimitée" },
];

// Un rapport est actif s'il est plus récent que la durée de rétention de sa veille
function rapportActif(r, veilles) {
  const v = veilles.find((x) => x.id === r.veilleId);
  if (!v || !v.retention) return true;
  const limite = Date.now() - v.retention * 86400000;
  const d = r.dateInfo ? new Date(r.dateInfo).getTime() : Date.now();
  return d >= limite;
}

// ——— Gestion des doublons : détection et proposition de fusion ———
// Similarité Jaccard sur les mots de plus de 3 caractères
function tokensSimilaires(texte) {
  return (texte || "").toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter((t) => t.length > 3);
}
function similarite(a, b) {
  const ta = new Set(tokensSimilaires(a)), tb = new Set(tokensSimilaires(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((t) => { if (tb.has(t)) inter++; });
  return inter / (ta.size + tb.size - inter);
}
// Détecte les paires suspectes : URL identique, titre quasi identique, ou contenu très proche
function detecterDoublons(rapports, ignores) {
  const res = [];
  for (let i = 0; i < rapports.length; i++) {
    for (let j = i + 1; j < rapports.length; j++) {
      const A = rapports[i], B = rapports[j];
      const cle = [A.id, B.id].sort().join("|");
      if (ignores && ignores[cle]) continue;
      const memeUrl = A.url && B.url && A.url === B.url;
      const simTitre = similarite(A.titre, B.titre);
      const simContenu = similarite((A.contenu || "").slice(0, 300), (B.contenu || "").slice(0, 300));
      const raisons = [];
      if (memeUrl) raisons.push("URL identique");
      if (simTitre >= 0.7) raisons.push("Titre quasi identique");
      if (simContenu >= 0.55) raisons.push("Contenu très proche");
      if (raisons.length) {
        res.push({
          A, B, cle,
          score: Math.round(Math.max(memeUrl ? 1 : 0, simTitre, simContenu) * 100),
          raisons,
        });
      }
    }
  }
  return res.sort((x, y) => y.score - x.score);
}

function PageDoublons({ db, maj, onOuvrirRapport, setMessage, focusId, onClearFocus }) {
  const ignores = db.doublonsIgnores || {};
  const pairesBrutes = detecterDoublons(db.rapports, ignores);
  const rapportFocus = focusId ? db.rapports.find((r) => r.id === focusId) : null;
  const paires = rapportFocus ? pairesBrutes.filter((p) => p.A.id === focusId || p.B.id === focusId) : pairesBrutes;

  // Fusionne : le rapport conservé récupère entités, informations, URL et liens d'événements
  const fusionner = (gardeId, retireId) => {
    maj((d) => {
      const garde = d.rapports.find((r) => r.id === gardeId);
      const retire = d.rapports.find((r) => r.id === retireId);
      if (!garde || !retire) return d;
      (retire.entitesIds || []).forEach((id) => { if (!garde.entitesIds.includes(id)) garde.entitesIds.push(id); });
      garde.informations = garde.informations || [];
      (retire.informations || []).forEach((info) => {
        if (!garde.informations.some((x) => (x.texte || "") === (info.texte || ""))) garde.informations.push({ ...info });
      });
      if (!garde.url && retire.url) garde.url = retire.url;
      d.entites.forEach((e) => {
        if ((e.rapportIds || []).includes(retire.id)) {
          e.rapportIds = e.rapportIds.filter((x) => x !== retire.id);
          if (!e.rapportIds.includes(garde.id)) e.rapportIds.push(garde.id);
        }
      });
      d.rapports = d.rapports.filter((r) => r.id !== retire.id);
      return d;
    });
    setMessage("Doublon fusionné : entités, informations et liens reportés sur le rapport conservé.");  };

  const ignorer = (cle) => {
    maj((d) => { d.doublonsIgnores = { ...(d.doublonsIgnores || {}), [cle]: true }; return d; });
    setMessage("Paire marquée « non-doublon » : elle n'apparaîtra plus dans la détection.");
  };

  const ResumeRapport = ({ r, grise }) => {
    const src = db.sources.find((s) => s.id === r.sourceId);
    const veille = db.veilles.find((v) => v.id === r.veilleId);
    return (
      <button onClick={() => onOuvrirRapport(r.id)}
        className={`flex-1 rounded-lg border p-3 text-left ${grise ? "border-slate-100 bg-slate-50 opacity-70" : "border-slate-200 bg-white hover:bg-sky-50"}`}>
        <div className="truncate text-sm font-semibold text-slate-800">📄 {r.titre}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{r.contenu}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <CotationBadge source={src ? src.fiabilite : undefined} info={r.cotationInfo} />
          <span className="text-xs text-slate-400">{(r.dateInfo || "").slice(0, 10)}</span>
          {veille && <Badge couleur="#7c3aed">🔎 {veille.nom}</Badge>}
          {r.provisoire && <Badge couleur="#f59e0b">⏳</Badge>}
          {r.url && <span className="truncate text-xs text-sky-600">🔗</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">♻️ Gestion des doublons</h3>
            <p className="text-sm text-slate-500">
              {db.rapports.length} rapport(s) analysé(s) — {paires.length} paire(s) suspecte(s) détectée(s)
              {Object.keys(ignores).length > 0 && " · " + Object.keys(ignores).length + " paire(s) marquée(s) non-doublon"}.
            </p>
          </div>
          <p className="max-w-md text-xs text-slate-400">
            Critères : URL identique, titre quasi identique (similarité ≥ 70 %) ou contenu très proche (≥ 55 %).
            La fusion reporte entités, informations, URL et liens d'événements sur le rapport conservé.
          </p>
        </div>
      </Card>
      {rapportFocus && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge couleur="#f59e0b">♻️ Rapport ciblé</Badge>
            <span className="font-semibold">{rapportFocus.titre}</span>
            <span className="text-xs text-slate-500">
              {paires.length > 0
                ? paires.length + " paire(s) suspecte(s) impliquant ce rapport"
                : "aucun doublon suspect pour ce rapport"}
            </span>
            {onClearFocus && (
              <button onClick={onClearFocus} className="ml-auto rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-300">Voir tous les doublons</button>
            )}
          </div>
        </Card>
      )}
      {paires.length === 0 && (
        <Card><p className="text-center text-sm text-slate-500">{rapportFocus ? "Ce rapport n'a pas de doublon détecté. Vous pouvez le marquer « à qualifier » ou le vérifier manuellement. ✅" : "Aucun doublon suspect détecté. La base est propre ✅"}</p></Card>
      )}
      {paires.map((p) => (
        <Card key={p.cle}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge couleur={p.score >= 85 ? "#dc2626" : p.score >= 70 ? "#f59e0b" : "#64748b"}>
              Similarité {p.score} %
            </Badge>
            {p.raisons.map((r) => <span key={r} className="text-xs text-slate-500">· {r}</span>)}
            <div className="ml-auto flex gap-2">
              <button onClick={() => ignorer(p.cle)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">✋ Pas un doublon</button>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            <ResumeRapport r={p.A} />
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-bold text-slate-400">⇄</span>
              <button onClick={() => fusionner(p.A.id, p.B.id)} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">⬅ Garder A</button>
              <button onClick={() => fusionner(p.B.id, p.A.id)} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Garder B ➡</button>
            </div>
            <ResumeRapport r={p.B} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function PageAccueil({ db, setOnglet, setSelectedId, setFormVeille, onOuvrirRapport, onActualiser }) {
  const [veilleOuverte, setVeilleOuverte] = useState(null);
  const [voirExpires, setVoirExpires] = useState(false);
  const rapportsTries = [...db.rapports].sort((a, b) => (b.dateInfo || "").localeCompare(a.dateInfo || ""));
  const recents = rapportsTries.filter((r) => rapportActif(r, db.veilles)).slice(0, 5);
  const veilleAvecId = (r) => db.veilles.find((v) => v.id === r.veilleId);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">🔎 Veilles actives</h3>
            <button onClick={() => setVoirExpires(!voirExpires)}
              className={`ml-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${voirExpires ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              {voirExpires ? "👁️ Expirés affichés" : "👁️ Voir les expirés"}
            </button>
            <button onClick={() => setOnglet("veilles")} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300">Gérer les veilles</button>
          </div>
          <div className="mt-3 space-y-2">
            {db.veilles.map((v) => {
              const tous = db.rapports.filter((r) => r.veilleId === v.id);
              const nbRapports = tous.filter((r) => rapportActif(r, db.veilles)).length;
              const nbExpires = tous.length - nbRapports;
              const nbSources = db.sources.filter((s) => s.veilleId === v.id).length;
              const rapportsVeille = (voirExpires ? rapportsTries.filter((r) => r.veilleId === v.id) : rapportsTries.filter((r) => r.veilleId === v.id && rapportActif(r, db.veilles)));
              return (
                <div key={v.id} className="rounded-lg bg-slate-50">
                  <div className="flex w-full items-start gap-2 p-3 text-left">
                    <button className="min-w-0 flex-1" onClick={() => setVeilleOuverte(veilleOuverte === v.id ? null : v.id)}>
                      <div className="font-semibold text-slate-800">{v.nom} <span className="text-xs font-normal text-slate-400">{veilleOuverte === v.id ? "▾" : "▸"}</span></div>
                      <div className="text-xs text-slate-500">{v.thematiques}</div>
                      <div className="mt-1 flex gap-2">
                        <Badge couleur="#0284c7">{nbRapports} rapport(s) actif(s)</Badge>
                        {nbExpires > 0 && <Badge couleur="#ea580c">{nbExpires} expiré(s)</Badge>}
                        <Badge couleur="#7c3aed">{nbSources} source(s)</Badge>
                        <Badge>créée le {v.creeeLe}</Badge>
                      </div>
                    </button>
                    <button onClick={() => setOnglet("veilles")} title="Gérer cette veille"
                      className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-300">⚙</button>
                    <button onClick={() => onActualiser(v.id)} title="Actualiser la veille"
                      className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700">🔄</button>
                  </div>
                  {veilleOuverte === v.id && (
                    <div className="space-y-1 border-t border-slate-200 p-2">
                      {rapportsVeille.length === 0 && <p className="px-2 py-1 text-xs text-slate-500">Aucun rapport pour cette veille.</p>}
                      {rapportsVeille.map((r) => {
                        const src = db.sources.find((s) => s.id === r.sourceId);
                        return (
                          <button key={r.id} onClick={() => onOuvrirRapport(r.id)}
                            className="flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left hover:bg-sky-50">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">📄 {r.titre}</span>
                            <CotationBadge source={src ? src.fiabilite : undefined} info={r.cotationInfo} />
                            {r.provisoire && <Badge couleur="#f59e0b">⏳ À qualifier</Badge>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {db.veilles.length === 0 && <p className="text-sm text-slate-500">Aucune veille en cours. Créez-en une dans l'onglet « Veilles & sources ».</p>}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">📊 État de la base</h3>
            <button onClick={() => setOnglet("donnees")} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300">Données</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.rapports.length}</div><div className="text-xs text-slate-500">Rapports</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.entites.length}</div><div className="text-xs text-slate-500">Entités</div></div>
            <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.liens.length}</div><div className="text-xs text-slate-500">Liens</div></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setOnglet("saisie")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">＋ Nouveau rapport</button>
            <button onClick={() => setOnglet("graphe")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">🧩 Schéma relationnel</button>
            <button onClick={() => setOnglet("frise")} className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300">📅 Frise chronologique</button>
            <button onClick={() => setOnglet("carte")} className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300">🗺️ Carte</button>
          </div>
        </Card>
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">📄 Dernières informations collectées</h3>
          <button onClick={() => setOnglet("saisie")} className="text-xs text-slate-500 underline hover:text-slate-800">Voir tous les rapports</button>
        </div>
        <div className="mt-3 space-y-2">
          {recents.map((r) => {
            const src = db.sources.find((s) => s.id === r.sourceId);
            const v = veilleAvecId(r);
            return (
              <div key={r.id} onClick={() => onOuvrirRapport(r.id)} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3 hover:bg-slate-100" style={{ cursor: "pointer" }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">{r.titre}</div>
                  <div className="truncate text-xs text-slate-500">{r.contenu}</div>
                </div>
                <CotationBadge source={src ? src.fiabilite : undefined} info={r.cotationInfo} />
                {r.provisoire && <Badge couleur="#f59e0b">⏳ À qualifier</Badge>}
                {v && <Badge couleur="#7c3aed">🔎 {v.nom}</Badge>}
              </div>
            );
          })}
          {recents.length === 0 && <p className="text-sm text-slate-500">Aucun rapport enregistré pour l'instant.</p>}
        </div>
      </Card>
    </div>
  );
}

// Affiche une information détaillée avec ses candidats (personnes, lieux, organisations, matériel) surlignés et validables
function SegmentsInfo({ info, rapport, db, onValider, onRejeter, typesProp, setTypesProp, onContextMenuTexte }) {
  const cands = useMemo(() => extraireCandidatsInfo(db, rapport, info.texte), [db, rapport.id, info.texte]);
  const segments = segmenterTexte(info.texte, cands);
  if (!segments.some((s) => s.cand)) {
    return <p className="text-sm text-slate-700" onContextMenu={onContextMenuTexte}>{info.texte}</p>;
  }
  return (
    <div className="text-sm leading-relaxed text-slate-700" onContextMenu={onContextMenuTexte}>
      {segments.map((s, i) =>
        s.texte !== undefined ? (
          <span key={i}>{s.texte}</span>
        ) : (
          <span key={i} className="mx-0.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 align-baseline">
            <span className="font-semibold text-amber-900">{s.cand.nom}</span>
            {setTypesProp && (
              <select
                value={typesProp[s.cand.cle] || s.cand.type}
                onChange={(e) => setTypesProp({ ...typesProp, [s.cand.cle]: e.target.value })}
                className="rounded border border-amber-300 bg-white px-1 py-0 text-[10px]">
                {TYPES_ENTITE.map((t) => <option key={t.code} value={t.code}>{t.icone} {t.label}</option>)}
              </select>
            )}
            <button onClick={() => onValider(s.cand)} title="Valider cette entité"
              className="rounded bg-green-600 px-1.5 py-0 text-[10px] font-bold text-white hover:bg-green-700">✓</button>
            <button onClick={() => onRejeter(s.cand)} title="Rejeter cette détection"
              className="rounded bg-slate-300 px-1.5 py-0 text-[10px] font-bold text-slate-700 hover:bg-slate-400">✕</button>
          </span>
        )
      )}
    </div>
  );
}

function RapportDetail({ rapport, db, onClose, majRapport, majSource, onCreerEvenement, onLierInfo, candidatsRapport, onValider, onRejeter, typesProp, setTypesProp, onAjouterEntite, onCreerLien, onSupprimerLien, onAjouterInfo, onModifierEntite, onSupprimerEntiteRapport }) {
  const src = db.sources.find((s) => s.id === rapport.sourceId);
  const veille = db.veilles.find((v) => v.id === rapport.veilleId);
  const infos = rapport.informations || [];
  const evenementLie = db.entites.find((e) => e.type === "evenement" && e.nom === rapport.titre && e.rapportIds.includes(rapport.id));
  const entitesRapport = db.entites.filter((e) => (rapport.entitesIds || []).includes(e.id));
  const idsRapport = new Set(rapport.entitesIds || []);
  const liensRapport = db.liens.filter((l) => idsRapport.has(l.fromId) && idsRapport.has(l.toId));
  const [newNom, setNewNom] = useState("");
  const [newType, setNewType] = useState("personne");
  const [lienFrom, setLienFrom] = useState("");
  const [lienTo, setLienTo] = useState("");
  const [lienType, setLienType] = useState(TYPES_LIEN[0]);
  const [lienCom, setLienCom] = useState("");
  const [lienNom, setLienNom] = useState("");
  const [infoTexte, setInfoTexte] = useState("");
  const [infoCotation, setInfoCotation] = useState("3");
  const [menuSurlign, setMenuSurlign] = useState(null); // { x, y, texte }

  // Découpe du contenu en segments, avec les candidats surlignés
  const segmentsContenu = segmenterTexte(rapport.contenu, candidatsRapport);
  const majInfo = (idx, champ, valeur) => {
    majRapport(rapport.id, (r) => {
      r.informations = (r.informations || []).map((x, i) => i === idx ? { ...x, [champ]: valeur } : x);
    });
  };
  // Clic droit sur du texte sélectionné → menu d'ajout d'entité
  const onContextMenuTexte = (ev) => {
    const sel = window.getSelection ? window.getSelection().toString().trim() : "";
    if (!sel || sel.length > 60) return;
    ev.preventDefault();
    setMenuSurlign({ x: ev.clientX, y: ev.clientY, texte: sel, type: "personne" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => { onClose(); setMenuSurlign(null); }}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{rapport.titre}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{rapport.dateInfo.replace("T", " ")}</span>
              {veille && <Badge couleur="#7c3aed">🔎 {veille.nom}</Badge>}
              {src && <Badge couleur={src.type === "fermee" ? "#dc2626" : "#0284c7"}>{src.type === "fermee" ? "source fermée" : "source ouverte"} : {src.nom}</Badge>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300">Fermer</button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Article complet</h4>
            {segmentsContenu.some((s) => s.cand) && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                🟡 Les entités détectées sont surlignées : corrigez leur type si besoin, validez-les (✓) ou rejetez-les (✕) directement dans le texte.
              </p>
            )}
            <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700" onContextMenu={onContextMenuTexte}>
              {segmentsContenu.map((s, i) =>
                s.texte !== undefined ? (
                  <span key={i}>{s.texte}</span>
                ) : (
                  <span key={i} className="mx-0.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 align-baseline">
                    <span className="font-semibold text-amber-900">{s.cand.nom}</span>
                    {setTypesProp && (
                      <select
                        value={typesProp[s.cand.cle] || s.cand.type}
                        onChange={(e) => setTypesProp({ ...typesProp, [s.cand.cle]: e.target.value })}
                        className="rounded border border-amber-300 bg-white px-1 py-0 text-[10px]">
                        {TYPES_ENTITE.map((t) => <option key={t.code} value={t.code}>{t.icone} {t.label}</option>)}
                      </select>
                    )}
                    <button onClick={() => onValider(s.cand)} title="Valider cette entité"
                      className="rounded bg-green-600 px-1.5 py-0 text-[10px] font-bold text-white hover:bg-green-700">✓</button>
                    <button onClick={() => onRejeter(s.cand)} title="Rejeter cette détection"
                      className="rounded bg-slate-300 px-1.5 py-0 text-[10px] font-bold text-slate-700 hover:bg-slate-400">✕</button>
                  </span>
                )
              )}
            </div>
            {rapport.url && (
              <a href={rapport.url} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                📖 Lire l'article original
              </a>
            )}
            {onCreerEvenement && veille && (
              evenementLie ? (
                <Badge couleur="#16a34a">📅 Événement créé : {evenementLie.nom}</Badge>
              ) : (
                <button onClick={onCreerEvenement} className="mt-2 ml-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                  📅 Créer l'événement correspondant
                </button>
              )
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Entités impliquées dans ce rapport</h4>
            <div className="mb-3 space-y-1">
              {entitesRapport.length === 0 && <span className="text-xs text-slate-500">Aucune entité rattachée pour l'instant.</span>}
              {entitesRapport.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                  <span className="text-sm">{iconeType(e.type)}</span>
                  <input
                    className="min-w-24 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-500 focus:outline-none"
                    defaultValue={e.prenom ? e.prenom + " " + e.nom : e.nom}
                    onBlur={(ev) => {
                      const val = ev.target.value.trim();
                      const actuel = (e.prenom ? e.prenom + " " + e.nom : e.nom);
                      if (val && val !== actuel) onModifierEntite(e.id, { nom: val });
                    }}
                  />
                  {onModifierEntite && (
                    <select className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs" value={e.type}
                      onChange={(ev) => onModifierEntite(e.id, { type: ev.target.value })}>
                      {TYPES_ENTITE.map((t) => <option key={t.code} value={t.code}>{t.icone} {t.label}</option>)}
                    </select>
                  )}
                  {onSupprimerEntiteRapport && (
                    <button onClick={() => onSupprimerEntiteRapport(e.id)} title="Retirer cette entité du rapport"
                      className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600">✕</button>
                  )}
                </div>
              ))}
            </div>
            {onAjouterEntite && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Nom de l'entité…"
                  value={newNom} onChange={(e) => setNewNom(e.target.value)} />
                <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={newType} onChange={(e) => setNewType(e.target.value)}>
                  {TYPES_ENTITE.map((t) => <option key={t.code} value={t.code}>{t.icone} {t.label}</option>)}
                </select>
                <button onClick={() => { if (newNom.trim()) { onAjouterEntite(newNom.trim(), newType); setNewNom(""); } }}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">＋ Ajouter l'entité au rapport</button>
              </div>
            )}
            {onCreerLien && (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={lienFrom} onChange={(e) => setLienFrom(e.target.value)}>
                    <option value="">Entité source…</option>
                    {entitesRapport.map((e) => <option key={e.id} value={e.id}>{iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}</option>)}
                  </select>
                  <span className="text-xs text-slate-400">→</span>
                  <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={lienType} onChange={(e) => setLienType(e.target.value)}>
                    {TYPES_LIEN.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <span className="text-xs text-slate-400">→</span>
                  <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={lienTo} onChange={(e) => setLienTo(e.target.value)}>
                    <option value="">Entité cible…</option>
                    {entitesRapport.map((e) => <option key={e.id} value={e.id}>{iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}</option>)}
                  </select>
                  <input className="min-w-24 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Nom du lien (optionnel)"
                    value={lienNom} onChange={(e) => setLienNom(e.target.value)} />
                  <input className="min-w-24 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="Commentaire (optionnel)"
                    value={lienCom} onChange={(e) => setLienCom(e.target.value)} />
                  <button onClick={() => { if (lienFrom && lienTo && lienFrom !== lienTo) { onCreerLien(lienFrom, lienTo, lienType, lienCom, lienNom); setLienFrom(""); setLienTo(""); setLienCom(""); setLienNom(""); } }}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">🔗 Créer le lien</button>
                </div>
                {liensRapport.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {liensRapport.map((l) => {
                      const a = db.entites.find((e) => e.id === l.fromId), b = db.entites.find((e) => e.id === l.toId);
                      if (!a || !b) return null;
                      return (
                        <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs">
                          {a.nom} → {l.type}
                          <input
                            className="w-20 rounded border border-transparent bg-transparent px-1 text-[11px] italic text-slate-600 hover:border-slate-300 focus:border-slate-500 focus:outline-none"
                            placeholder="nom…"
                            defaultValue={l.nom || ""}
                            onBlur={(ev) => {
                              const v = ev.target.value.trim();
                              if (v !== (l.nom || "")) maj((d) => { const x = d.liens.find((y) => y.id === l.id); if (x) x.nom = v; return d; });
                            }}
                          />
                          → {b.nom}
                          {onSupprimerLien && <button onClick={() => onSupprimerLien(l.id)} className="text-slate-400 hover:text-red-600">✕</button>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Évaluation de la source</h4>
            {src ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">{src.nom}</div>
                  <div className="text-xs text-slate-500">{src.description}</div>
                  {src.url && <a href={src.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">{src.url}</a>}
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-slate-600">Fiabilité (A–F)</span>
                  <select className={inputCls} value={src.fiabilite}
                    onChange={(e) => majSource(src.id, (s) => { s.fiabilite = e.target.value; })}>
                    {FIABILITE.map((f) => <option key={f.code} value={f.code}>{f.code} — {f.label}</option>)}
                  </select>
                </div>
                <CotationBadge source={src.fiabilite} info={rapport.cotationInfo} />
              </div>
            ) : <p className="text-sm text-slate-500">Aucune source rattachée à ce rapport.</p>}
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Cotation globale du rapport</h4>
            <div className="flex flex-wrap items-center gap-3">
              <select className={inputCls} style={{ maxWidth: 260 }} value={rapport.cotationInfo}
                onChange={(e) => majRapport(rapport.id, (r) => { r.cotationInfo = e.target.value; r.provisoire = false; })}>
                {CREDIBILITE.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
              </select>
              <CotationBadge source={src ? src.fiabilite : undefined} info={rapport.cotationInfo} />
              {rapport.provisoire && <Badge couleur="#f59e0b">⏳ À qualifier — rapport d'ouverture non encore vérifié</Badge>}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Informations détaillées et cotation</h4>
            {infos.length === 0 && <p className="text-sm text-slate-500">Aucune information individuelle pour l'instant.</p>}
            <div className="space-y-3">
              {infos.map((info, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3">
                  <SegmentsInfo info={info} rapport={rapport} db={db} onValider={onValider} onRejeter={onRejeter} typesProp={typesProp} setTypesProp={setTypesProp} onContextMenuTexte={onContextMenuTexte} />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Crédibilité :</span>
                    <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={info.cotation}
                      onChange={(e) => majInfo(i, "cotation", e.target.value)}>
                      {CREDIBILITE.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                    </select>
                    <CotationBadge source={src ? src.fiabilite : undefined} info={info.cotation} />
                    <span className="text-xs text-slate-400">{(CREDIBILITE.find((c) => c.code === info.cotation) || {}).label || ""}</span>
                    {veille && (
                      info.evenementLie ? (
                        <Badge couleur="#16a34a">📅 Liée à l'événement</Badge>
                      ) : (
                        <button onClick={() => onLierInfo(i)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
                          📅 Créer l'événement correspondant et lier cette information
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
            {onAjouterInfo && (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3">
                <div className="mb-2 text-xs font-semibold text-slate-600">➕ Ajouter une information à ce rapport</div>
                <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={2}
                  placeholder="Saisissez une information individuelle (personnes, lieux, organisations, matériel impliqués seront détectés automatiquement)…"
                  value={infoTexte} onChange={(e) => setInfoTexte(e.target.value)} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={infoCotation} onChange={(e) => setInfoCotation(e.target.value)}>
                    {CREDIBILITE.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                  </select>
                  <button onClick={() => { if (infoTexte.trim()) { onAjouterInfo(infoTexte.trim(), infoCotation); setInfoTexte(""); } }}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                    ＋ Ajouter l'information
                  </button>
                  <span className="text-xs text-slate-400">La détection automatique s'appliquera immédiatement : les impliqués seront surlignés et validables.</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {menuSurlign && (
          <div className="fixed z-[60] w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
            style={{ left: Math.min(menuSurlign.x, window.innerWidth - 270), top: Math.min(menuSurlign.y, window.innerHeight - 170) }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-xs font-bold uppercase text-slate-500">Ajouter comme entité</div>
            <div className="mb-2 truncate rounded bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">« {menuSurlign.texte} »</div>
            <div className="mb-2 flex gap-1">
              {TYPES_ENTITE.map((t) => (
                <button key={t.code} onClick={() => setMenuSurlign({ ...menuSurlign, type: t.code })}
                  title={t.label}
                  className={`rounded px-1.5 py-1 text-sm ${menuSurlign.type === t.code ? "ring-2 ring-slate-800" : ""}`}
                  style={{ backgroundColor: menuSurlign.type === t.code ? t.couleur : "#f1f5f9" }}>
                  {t.icone}
                </button>
              ))}
            </div>
            <button
              onClick={() => { onAjouterEntite(menuSurlign.texte, menuSurlign.type); setMenuSurlign(null); }}
              className="w-full rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
              ＋ Ajouter « {menuSurlign.texte.slice(0, 18)}{menuSurlign.texte.length > 18 ? "…" : ""} »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [db, setDb] = useState(chargerDB());
  const [onglet, setOnglet] = useState("accueil");
  const [focusDoublon, setFocusDoublon] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingEntiteId, setEditingEntiteId] = useState(null);
  const [editingRapportId, setEditingRapportId] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [rapportOuvert, setRapportOuvert] = useState(null);
  const [filtreTypes, setFiltreTypes] = useState(null);
  const [modeRang1, setModeRang1] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      localStorage.setItem(DB_MAJ_KEY, new Date().toISOString());
    } catch (e) {}
  }, [db]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // --- Base de référence (dépôt GitHub) ---
  const [baseRef, setBaseRef] = useState(null); // dernière base lue sur GitHub
  const [majDispo, setMajDispo] = useState(false); // true si la base GitHub est plus récente que la locale
  const [etatBaseRef, setEtatBaseRef] = useState("silence"); // silence | attente | ok | erreur

  const verifierBaseRef = async () => {
    setEtatBaseRef("attente");
    try {
      const rep = await fetch(RAW_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!rep.ok) throw new Error("HTTP " + rep.status);
      const data = JSON.parse(await rep.text());
      if (!data.entites || !Array.isArray(data.entites)) throw new Error("format");
      setBaseRef(data);
      setEtatBaseRef("ok");
      let locale = null;
      try { locale = localStorage.getItem(DB_MAJ_KEY); } catch (e) {}
      // plus récente que la base locale ? (absence d'horodatage local = première utilisation → proposer)
      setMajDispo(!locale || !data.sauvegardeLe || data.sauvegardeLe > locale);
      return data;
    } catch (e) {
      setEtatBaseRef("erreur");
      setMajDispo(false);
      return null;
    }
  };

  useEffect(() => { verifierBaseRef(); }, []);

  const chargerBaseRef = async () => {
    const data = baseRef || (await verifierBaseRef());
    if (!data) { setMessage("Base de référence inaccessible."); return null; }
    try {
      const copie = structuredClone(data);
      if (!copie.rejets) copie.rejets = [];
      setDb(copie);
      setMessage("Base de référence chargée (" + (data.sauvegardeLe ? "version du " + data.sauvegardeLe.replace("T", " ").slice(0, 16) : "version non datée") + ").");
      setMajDispo(false);
      return copie;
    } catch (e) {
      setMessage("Chargement impossible.");
      return null;
    }
  };

  const emptyEntite = () => ({ id: uid(), type: "personne", nom: "", resume: "", dateHeure: "", lieu: "", prenom: "", biographie: "", latitude: "", longitude: "", description: "", rapportIds: [] });
  const [formEntite, setFormEntite] = useState(emptyEntite());
  const [formSource, setFormSource] = useState({ nom: "", type: "ouverte", fiabilite: "B", description: "", veilleId: null, url: "" });
  const [formRapport, setFormRapport] = useState({ titre: "", contenu: "", dateInfo: "", cotationInfo: "3", sourceId: null, veilleId: null, entitesIds: [], informations: [], creerEvenement: true });
  const [formLien, setFormLien] = useState({ fromId: "", toId: "", type: TYPES_LIEN[0], nom: "", commentaire: "" });
  const [formVeille, setFormVeille] = useState({ nom: "", thematiques: "", retention: 30 });
  const [formHashtags, setFormHashtags] = useState({ tags: "", retention: 30 });
  const [formComptes, setFormComptes] = useState({ liste: "", texte: "" });

  useEffect(() => {
    if (onglet.startsWith("type-") && !editingEntiteId) {
      setFormEntite((f) => (f.type === onglet.slice(5) ? f : { ...f, type: onglet.slice(5) }));
    }
  }, [onglet, editingEntiteId]);
  const [importText, setImportText] = useState("");

  const maj = (fn) => setDb((d) => lierMemeSource(fn(structuredClone(d))));

  const majRapport = (id, fn) => maj((d) => {
    const r = d.rapports.find((x) => x.id === id);
    if (r) fn(r);
    return d;
  });

  const majSource = (id, fn) => maj((d) => {
    const s = d.sources.find((x) => x.id === id);
    if (s) fn(s);
    return d;
  });

  // Import des comptes (alias @handle) d'une liste Twitter/X : chaque compte devient une source surveillée
  const importerComptes = () => {
    if (!formComptes.liste.trim() || !formComptes.texte.trim()) return;
    let nb = 0;
    let nbOuverture = 0;
    const nomVeille = "Twitter/X — " + formComptes.liste.trim();
    maj((d) => {
      let veille = d.veilles.find((v) => v.nom === nomVeille);
      let nouvelle = false;
      if (!veille) {
        veille = { id: uid(), nom: nomVeille, thematiques: "Comptes de la liste Twitter/X : " + formComptes.liste.trim(), creeeLe: new Date().toISOString().slice(0, 10), retention: 30 };
        d.veilles.push(veille);
        nouvelle = true;
      }
      if (nouvelle) nbOuverture = peuplerVeille(d, veille, formComptes.liste);
      formComptes.texte.split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((ligne) => {
        // formats acceptés : "@handle", "alias @handle", "@handle — alias", "alias (@handle)"
        const m = ligne.match(/@([A-Za-z0-9_]+)/);
        if (!m) return;
        const handle = "@" + m[1];
        let alias = ligne.replace(/[@][A-Za-z0-9_]+/g, "").replace(/[—–\-()•·|]/g, " ").replace(/\s+/g, " ").trim();
        const nomCompte = (alias && alias !== handle ? alias : handle);
        // éviter les doublons de source pour le même handle
        if (d.sources.some((s) => s.veilleId === veille.id && (s.url === "https://x.com/" + m[1] || s.nom.includes(handle)))) return;
        d.sources.push({
          id: uid(),
          nom: nomCompte + " (" + handle + ")",
          type: "ouverte", fiabilite: "C",
          description: "Compte Twitter/X de la liste « " + formComptes.liste.trim() + " »",
          veilleId: veille.id,
          url: "https://x.com/" + m[1],
        });
        nb++;
      });
      return d;
    });
    setFormComptes({ liste: "", texte: "" });
    setMessage(nb + " compte(s) ajouté(s) comme sources de la veille « " + nomVeille + " »" + (nbOuverture ? " ; " + nbOuverture + " rapport(s) d'ouverture injecté(s), à qualifier." : "."));
  };

  // « Joue » une veille à sa création : injecte une dizaine de rapports actifs,
  // classés par pertinence avec les mots-clés de la veille (corpus recoupé du 3 octobre 2026)
  const peuplerVeille = (d, veille, motsCles) => {
    const tokens = (motsCles || "").toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter((t) => t.length > 3);
    const pool = [
      ...VEILLE_AFRIQUE.rapports.map((r) => ({ titre: r.titre, contenu: r.contenu, url: r.url, sourceId: r.sourceId, informations: (r.informations || []).map((i) => ({ ...i })) })),
      ...FLUX_ACTUALISATION.v3.map((r) => ({ titre: r.titre, contenu: r.contenu, url: r.url, sourceId: r.sourceId, informations: (r.informations || []).map((i) => ({ ...i })) })),
    ];
    const score = (a) => {
      const texte = (a.titre + " " + a.contenu).toLowerCase();
      return tokens.reduce((s, t) => s + (texte.includes(t) ? 1 : 0), 0);
    };
    const tries = [...pool].sort((a, b) => score(b) - score(a));
    let nb = 0;
    tries.slice(0, 10).forEach((a) => {
      if (d.rapports.some((r) => r.veilleId === veille.id && r.titre === a.titre)) return;
      const r = {
        id: uid(), titre: a.titre, contenu: a.contenu,
        dateInfo: new Date().toISOString().slice(0, 16),
        cotationInfo: "3", sourceId: a.sourceId, veilleId: veille.id,
        entitesIds: [], informations: a.informations, url: a.url,
        provisoire: true,
      };
      d.rapports.push(r);
      creerEvenementDepuisRapport(d, r);
      nb++;
    });
    return nb;
  };

  const ajouterVeille = () => {
    if (!formVeille.nom.trim()) return;
    let messageFin = "Veille créée.";
    maj((d) => {
      const v = { id: uid(), nom: formVeille.nom, thematiques: formVeille.thematiques, creeeLe: new Date().toISOString().slice(0, 10), retention: formVeille.retention ?? 30 };
      d.veilles.push(v);
      const nb = peuplerVeille(d, v, formVeille.nom + " " + formVeille.thematiques);
      messageFin = "Veille créée : " + nb + " rapport(s) d'ouverture ajouté(s) — issus du recoupement du 3 octobre 2026, cotés 3, à qualifier.";
      return d;
    });
    setFormVeille({ nom: "", thematiques: "" });
    setOnglet("accueil");
    setMessage(messageFin);
  };

  // Création d'une veille par hashtags : les mots-clés deviennent la thématique de la veille
  const creerVeilleHashtags = () => {
    const brut = formHashtags.tags.trim();
    if (!brut) return;
    // normalise : "sahel, mali" ou "#sahel #mali" → ["#sahel", "#mali"]
    const tags = brut.split(/[\s,;]+/).filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : "#" + t.replace(/^#*/, "")))
      .filter((t, i, arr) => arr.indexOf(t) === i);
    if (!tags.length) return;
    const nom = tags.join(" ");
    let messageFin = "Veille « " + nom + " » créée.";
    maj((d) => {
      if (d.veilles.some((v) => v.nom === nom)) return d;
      const v = {
        id: uid(), nom,
        thematiques: "Veille par hashtags : " + tags.join(" "),
        creeeLe: new Date().toISOString().slice(0, 10),
        retention: formHashtags.retention, hashtags: tags,
      };
      d.veilles.push(v);
      const nb = peuplerVeille(d, v, tags.join(" "));
      messageFin = "Veille « " + nom + " » créée : " + nb + " rapport(s) d'ouverture ajouté(s) — les plus pertinents pour vos hashtags, à qualifier.";
      return d;
    });
    setFormHashtags({ tags: "", retention: 30 });
    setOnglet("accueil");
    setMessage(messageFin);
  };

  // Actualisation à la demande : injecte le prochain article du flux dans la veille
  const actualiserVeille = (veilleId) => {
    const flux = FLUX_ACTUALISATION[veilleId] || [];
    let resultat = null;
    maj((d) => {
      if (!d.fluxConsommes) d.fluxConsommes = {};
      const n = d.fluxConsommes[veilleId] || 0;
      const item = flux[n];
      if (!item) return d;
      const r = {
        id: uid(), titre: item.titre, contenu: item.contenu, dateInfo: item.dateInfo,
        cotationInfo: item.cotationInfo, sourceId: item.sourceId, veilleId,
        entitesIds: [], informations: (item.informations || []).map((i) => ({ ...i })),
        url: item.url,
      };
      d.rapports.push(r);
      d.fluxConsommes[veilleId] = n + 1;
      creerEvenementDepuisRapport(d, r);
      resultat = r;
      return d;
    });
    if (resultat) setMessage("Veille actualisée : nouveau rapport « " + resultat.titre + " ». Détection automatique appliquée.");
    else setMessage("Flux à jour : aucune nouvelle information en attente pour cette veille.");
  };

  const ajouterSource = () => {
    if (!formSource.nom.trim()) return;
    maj((d) => { d.sources.push({ ...formSource, id: uid() }); return d; });
    setFormSource({ nom: "", type: "ouverte", fiabilite: "B", description: "", veilleId: null, url: "" });
    setMessage("Source enregistrée.");
  };

  const creerEvenementDepuisRapport = (d, r) => {
    if (!r.titre || !r.veilleId) return null;
    const existant = d.entites.find((e) => e.type === "evenement" && e.nom === r.titre && e.rapportIds.includes(r.id));
    if (existant) return existant;
    const ev = {
      id: uid(), type: "evenement", nom: r.titre,
      resume: (r.contenu || "").slice(0, 140),
      dateHeure: r.dateInfo || "", lieu: "", prenom: "", biographie: "",
      latitude: "", longitude: "", description: r.contenu || "",
      rapportIds: [r.id],
    };
    d.entites.push(ev);
    if (!r.entitesIds.includes(ev.id)) r.entitesIds.push(ev.id);
    return ev;
  };

  const ajouterRapport = () => {
    if (!formRapport.titre.trim()) return;
    maj((d) => {
      const r = { ...formRapport, id: editingRapportId || uid() };
      if (editingRapportId) {
        const i = d.rapports.findIndex((x) => x.id === editingRapportId);
        if (i >= 0) d.rapports[i] = r;
      } else d.rapports.push(r);
      r.entitesIds.forEach((eid) => {
        const e = d.entites.find((x) => x.id === eid);
        if (e && !e.rapportIds.includes(r.id)) e.rapportIds.push(r.id);
      });
      if (r.creerEvenement !== false && r.veilleId) creerEvenementDepuisRapport(d, r);
      return d;
    });
    setFormRapport({ titre: "", contenu: "", dateInfo: "", cotationInfo: "3", sourceId: null, veilleId: null, entitesIds: [], informations: [], creerEvenement: true });
    setEditingRapportId(null);
    setMessage("Rapport enregistré.");
  };

  const sauverEntite = () => {
    if (!formEntite.nom.trim()) return;
    maj((d) => {
      if (editingEntiteId) {
        const i = d.entites.findIndex((x) => x.id === editingEntiteId);
        if (i >= 0) d.entites[i] = formEntite;
      } else d.entites.push(formEntite);
      return d;
    });
    setFormEntite(emptyEntite());
    setEditingEntiteId(null);
    setMessage("Entité enregistrée.");
  };

  const ajouterLien = () => {
    if (!formLien.fromId || !formLien.toId || formLien.fromId === formLien.toId) return;
    maj((d) => { d.liens.push({ ...formLien, id: uid() }); return d; });
    setFormLien({ fromId: "", toId: "", type: TYPES_LIEN[0], nom: "", commentaire: "" });
    setMessage("Lien créé.");
  };

  const supprimer = (kind, id) => {
    maj((d) => {
      if (kind === "entite") {
        d.entites = d.entites.filter((e) => e.id !== id);
        d.liens = d.liens.filter((l) => l.fromId !== id && l.toId !== id);
        d.rapports.forEach((r) => { r.entitesIds = r.entitesIds.filter((x) => x !== id); });
      }
      if (kind === "rapport") { d.rapports = d.rapports.filter((r) => r.id !== id); d.entites.forEach((e) => { e.rapportIds = e.rapportIds.filter((x) => x !== id); }); }
      if (kind === "source") d.sources = d.sources.filter((s) => s.id !== id);
      if (kind === "lien") d.liens = d.liens.filter((l) => l.id !== id);
      if (kind === "veille") d.veilles = d.veilles.filter((v) => v.id !== id);
      return d;
    });
    if (selectedId === id) setSelectedId(null);
    setMessage("Élément supprimé.");
  };

  // Fusion d'entités : gardeId absorbe retireId (rapports, liens, champs vides)
  const fusionnerEntites = (gardeId, retireId) => {
    let nomRetire = "";
    maj((d) => {
      const garde = d.entites.find((e) => e.id === gardeId);
      const retire = d.entites.find((e) => e.id === retireId);
      if (!garde || !retire || garde.id === retire.id) return d;
      nomRetire = retire.prenom ? retire.prenom + " " + retire.nom : retire.nom;
      // Rapports : la fiche conservée récupère toutes les références
      garde.rapportIds = [...new Set([...(garde.rapportIds || []), ...(retire.rapportIds || [])])];
      d.rapports.forEach((r) => {
        if ((r.entitesIds || []).includes(retire.id)) {
          r.entitesIds = r.entitesIds.filter((x) => x !== retire.id);
          if (!r.entitesIds.includes(garde.id)) r.entitesIds.push(garde.id);
        }
      });
      // Liens : rebranchés sur l'entité conservée, doublons retirés
      d.liens.forEach((l) => {
        if (l.fromId === retire.id) l.fromId = garde.id;
        if (l.toId === retire.id) l.toId = garde.id;
      });
      const vus = new Set();
      d.liens = d.liens.filter((l) => {
        const cle = l.fromId + "|" + l.toId + "|" + l.type + "|" + (l.nom || "");
        if (l.fromId === l.toId) return false;
        if (vus.has(cle)) return false;
        vus.add(cle);
        return true;
      });
      // Champs vides de la fiche conservée complétés par la fusionnée
      ["resume", "description", "dateHeure", "lieu", "prenom", "biographie", "latitude", "longitude"].forEach((champ) => {
        if (!garde[champ] && retire[champ]) garde[champ] = retire[champ];
      });
      d.entites = d.entites.filter((e) => e.id !== retire.id);
      return d;
    });
    if (selectedId === retireId) setSelectedId(gardeId);
    setMessage("Entité fusionnée : « " + nomRetire + " » a été absorbée ; rapports et liens rebranchés.");
  };

  const exporterJSON = () => {
    const exportBase = { ...db, sauvegardeLe: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportBase, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "base-renseignement.json"; a.click();
    URL.revokeObjectURL(url);
    setMessage("Export JSON téléchargé.");
  };

  const exporterCSV = () => {
    const entete = "type;id;nom;prenom;resume;dateHeure;lieu;latitude;longitude;description";
    const lignes = db.entites.map((e) => [e.type, e.id, e.nom, e.prenom, e.resume, e.dateHeure, e.lieu, e.latitude, e.longitude, e.description].map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(";"));
    const csv = entete + "\n" + lignes.join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "entites.csv"; a.click();
    URL.revokeObjectURL(url);
    setMessage("Export CSV téléchargé.");
  };

  const importer = (texte) => {
    try {
      const data = JSON.parse(texte);
      if (!data.entites || !Array.isArray(data.entites)) throw new Error("format");
      maj((d) => {
        const existants = new Set(d.entites.map((e) => e.id));
        d.entites.push(...data.entites.filter((e) => !existants.has(e.id)));
        if (Array.isArray(data.liens)) d.liens.push(...data.liens.filter((l) => l.fromId && l.toId));
        if (Array.isArray(data.rapports)) d.rapports.push(...data.rapports);
        if (Array.isArray(data.sources)) d.sources.push(...data.sources);
        return d;
      });
      setImportText("");
      setMessage("Import réussi.");
    } catch (e) {
      setMessage("Import impossible : JSON invalide (format d'export attendu).");
    }
  };

  const onFichier = (ev) => {
    const f = ev.target.files ? ev.target.files[0] : null;
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => importer(String(reader.result));
    reader.readAsText(f);
    ev.target.value = "";
  };

  const resultatsRecherche = useMemo(() => {
    if (!recherche.trim()) return null;
    const q = recherche.toLowerCase();
    return db.entites.filter((e) =>
      [e.nom, e.prenom, e.resume, e.biographie, e.description].join(" ").toLowerCase().includes(q)
    );
  }, [recherche, db.entites]);

  const candidats = useMemo(() => extraireCandidats(db), [db]);
  const [typesProp, setTypesProp] = useState({});

  const idsLies = useMemo(() => {
    const s = new Set();
    db.liens.forEach((l) => { s.add(l.fromId); s.add(l.toId); });
    return s;
  }, [db.liens]);

  const dbFiltre = useMemo(() => {
    if (!filtreTypes) return db;
    if (filtreTypes === "liens") {
      return { ...db, entites: db.entites.filter((e) => idsLies.has(e.id)) };
    }
    return { ...db, entites: db.entites.filter((e) => e.type === filtreTypes) };
  }, [db, filtreTypes, idsLies]);

  const validerCandidat = (c) => {
    const type = typesProp[c.cle] || c.type;
    maj((d) => {
      const gaz = type === "lieu" ? GAZETTIER_TROUVER(c.nom) : null;
      const e = {
        id: uid(), type, nom: c.nom, resume: "Issu de la veille : " + c.rapportTitre,
        dateHeure: "", lieu: "", prenom: "", biographie: "",
        latitude: gaz ? gaz.lat : "", longitude: gaz ? gaz.lng : "",
        description: "", rapportIds: [c.rapportId],
      };
      d.entites.push(e);
      const r = d.rapports.find((x) => x.id === c.rapportId);
      if (r && !r.entitesIds.includes(e.id)) r.entitesIds.push(e.id);
      return d;
    });
    setMessage(gaz0(type, c) ? "Entité ajoutée et géolocalisée." : "Entité ajoutée à la base.");
  };

  const gaz0 = (type, c) => type === "lieu" && GAZETTIER_TROUVER(c.nom);

  const rejeterCandidat = (c) => {
    maj((d) => {
      if (!d.rejets) d.rejets = [];
      d.rejets.push(c.cle);
      return d;
    });
  };

  const entiteSelectionnee = db.entites.find((e) => e.id === selectedId) || null;
  const typeOnglet = onglet.startsWith("type-") ? onglet.slice(5) : null;
  const onglets = [
    { code: "accueil", label: "Accueil · Veille" },
    { code: "graphe", label: "Schéma relationnel" },
    ...TYPES_ENTITE.map((t) => ({
      code: "type-" + t.code,
      label: t.icone + " " + t.label + (db.entites.filter((e) => e.type === t.code).length ? " (" + db.entites.filter((e) => e.type === t.code).length + ")" : ""),
    })),
    { code: "frise", label: "Frise chronologique" },
    { code: "carte", label: "Carte" },
    { code: "veilles", label: "Veilles & sources" },
    { code: "sources", label: "Sources" },
    { code: "saisie", label: "Saisie d'information" },
    { code: "donnees", label: "Données" },
    { code: "doublons", label: "♻️ Doublons" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">🛰️ Poste de veille &amp; capitalisation</h1>
          <input
            placeholder="Rechercher une entité…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className={`${inputCls} ml-auto max-w-xs`}
          />
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {onglets.map((o) => (
            <button
              key={o.code}
              onClick={() => setOnglet(o.code)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${onglet === o.code ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-200"}`}
            >
              {o.label}
            </button>
          ))}
        </nav>
      </header>

      {majDispo && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="flex-1">🔄 Une base de référence plus récente est disponible sur le dépôt GitHub.</span>
            <button onClick={chargerBaseRef} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Charger la base de référence</button>
            <button onClick={() => setMajDispo(false)} className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-300">Plus tard</button>
          </div>
        </div>
      )}
      {message && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{message}</div>
      )}

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {onglet === "accueil" && (
          <PageAccueil db={db} setOnglet={setOnglet} setSelectedId={setSelectedId} setFormVeille={setFormVeille} onOuvrirRapport={setRapportOuvert} onActualiser={actualiserVeille} />
        )}

        {rapportOuvert && db.rapports.find((r) => r.id === rapportOuvert) && (
          <RapportDetail
            rapport={db.rapports.find((r) => r.id === rapportOuvert)}
            db={db}
            onClose={() => setRapportOuvert(null)}
            majRapport={majRapport}
            majSource={majSource}
            onCreerEvenement={() => {
              maj((d) => {
                const r = d.rapports.find((x) => x.id === rapportOuvert);
                const ev = r && creerEvenementDepuisRapport(d, r);
                if (ev) setMessage("Événement créé : " + ev.nom);
                else setMessage("Événement déjà existant ou veille non renseignée.");
                return d;
              });
            }}
            candidatsRapport={candidats.filter((c) => c.rapportId === rapportOuvert)}
            onValider={validerCandidat}
            onRejeter={rejeterCandidat}
            typesProp={typesProp}
            setTypesProp={setTypesProp}
            onAjouterEntite={(nom, type) => {
              maj((d) => {
                const r = d.rapports.find((x) => x.id === rapportOuvert);
                if (!r) return d;
                const gaz = type === "lieu" ? GAZETTIER_TROUVER(nom) : null;
                const e = {
                  id: uid(), type, nom, resume: "Ajouté depuis le rapport : " + r.titre,
                  dateHeure: "", lieu: "", prenom: "", biographie: "",
                  latitude: gaz ? gaz.lat : "", longitude: gaz ? gaz.lng : "",
                  description: "", rapportIds: [r.id],
                };
                d.entites.push(e);
                if (!r.entitesIds.includes(e.id)) r.entitesIds.push(e.id);
                return d;
              });
              setMessage("Entité ajoutée et rattachée au rapport.");
            }}
            onCreerLien={(fromId, toId, type, commentaire, nom) => {
              maj((d) => { d.liens.push({ id: uid(), fromId, toId, type, commentaire, nom }); return d; });
              setMessage("Lien créé.");
            }}
            onSupprimerLien={(id) => {
              maj((d) => { d.liens = d.liens.filter((l) => l.id !== id); return d; });
            }}
            onAjouterInfo={(texte, cotation) => {
              maj((d) => {
                const r = d.rapports.find((x) => x.id === rapportOuvert);
                if (!r) return d;
                r.informations = [...(r.informations || []), { texte, cotation }];
                return d;
              });
              setMessage("Information ajoutée : détection automatique appliquée.");
            }}
            onModifierEntite={(entiteId, champs) => {
              maj((d) => {
                const e = d.entites.find((x) => x.id === entiteId);
                if (!e) return d;
                if (champs.nom !== undefined) {
                  const parts = champs.nom.split(" ");
                  if (e.prenom && e.type === "personne" && parts.length >= 2) {
                    e.prenom = parts.slice(0, -1).join(" ");
                    e.nom = parts[parts.length - 1];
                  } else {
                    e.nom = champs.nom;
                  }
                }
                if (champs.type !== undefined) e.type = champs.type;
                return d;
              });
              setMessage("Entité modifiée.");
            }}
            onSupprimerEntiteRapport={(entiteId) => {
              maj((d) => {
                const r = d.rapports.find((x) => x.id === rapportOuvert);
                if (r) {
                  r.entitesIds = (r.entitesIds || []).filter((id) => id !== entiteId);
                  const e = d.entites.find((x) => x.id === entiteId);
                  if (e) e.rapportIds = (e.rapportIds || []).filter((id) => id !== rapportOuvert);
                }
                return d;
              });
              setMessage("Entité retirée du rapport.");
            }}
            onLierInfo={(idx) => {
              const info = (db.rapports.find((r) => r.id === rapportOuvert).informations || [])[idx];
              maj((d) => {
                const r = d.rapports.find((x) => x.id === rapportOuvert);
                const ev = creerEvenementDepuisRapport(d, r) ||
                  d.entites.find((e) => e.type === "evenement" && e.nom === r.titre && e.rapportIds.includes(r.id));
                if (ev && r) {
                  const i = r.informations[idx];
                  if (i) {
                    i.evenementLie = true;
                    if (i.texte && !(ev.description || "").includes(i.texte)) {
                      ev.description = (ev.description ? ev.description + "\n\n" : "") + "— Information cotée " + i.cotation + " : " + i.texte;
                    }
                    if (!ev.rapportIds.includes(r.id)) ev.rapportIds.push(r.id);
                  }
                  setMessage("Information liée à l'événement : " + ev.nom);
                } else setMessage("Événement introuvable et veille non renseignée.");
                return d;
              });
              void info;
            }}
          />
        )}

        {resultatsRecherche && (
          <Card>
            <h3 className="mb-2 text-sm font-bold uppercase text-slate-500">Résultats ({resultatsRecherche.length})</h3>
            <div className="flex flex-wrap gap-2">
              {resultatsRecherche.map((e) => (
                <button key={e.id} onClick={() => { setSelectedId(e.id); setOnglet("type-" + e.type); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                  {iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}
                </button>
              ))}
              {resultatsRecherche.length === 0 && <p className="text-sm text-slate-500">Aucun résultat.</p>}
            </div>
          </Card>
        )}

        {onglet === "graphe" && (
          <>
            <BarreFiltres filtreTypes={filtreTypes} setFiltreTypes={setFiltreTypes} modeRang1={modeRang1} setModeRang1={setModeRang1} />
            <GrapheRelationnel db={dbFiltre} onSelect={(id) => setSelectedId(id)} selectedId={selectedId} modeRang1={modeRang1} />
            {entiteSelectionnee && (
              <FicheEntite entite={entiteSelectionnee} db={db} onClose={() => setSelectedId(null)} onFusionDoublon={fusionnerEntites}
                onEdit={() => { setFormEntite(structuredClone(entiteSelectionnee)); setEditingEntiteId(entiteSelectionnee.id); setOnglet("type-" + entiteSelectionnee.type); }} />
            )}
            <Card>
              <h3 className="mb-2 font-semibold">Créer un lien</h3>
              <div className="grid gap-3 md:grid-cols-6">
                <select className={inputCls} value={formLien.fromId} onChange={(e) => setFormLien({ ...formLien, fromId: e.target.value })}>
                  <option value="">Entité source…</option>
                  {db.entites.map((e) => <option key={e.id} value={e.id}>{iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}</option>)}
                </select>
                <select className={inputCls} value={formLien.type} onChange={(e) => setFormLien({ ...formLien, type: e.target.value })}>
                  {TYPES_LIEN.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input className={inputCls} placeholder="Nom du lien (optionnel)" value={formLien.nom || ""} onChange={(e) => setFormLien({ ...formLien, nom: e.target.value })} />
                <select className={inputCls} value={formLien.toId} onChange={(e) => setFormLien({ ...formLien, toId: e.target.value })}>
                  <option value="">Entité cible…</option>
                  {db.entites.map((e) => <option key={e.id} value={e.id}>{iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}</option>)}
                </select>
                <input className={inputCls} placeholder="Commentaire" value={formLien.commentaire} onChange={(e) => setFormLien({ ...formLien, commentaire: e.target.value })} />
                <button onClick={ajouterLien} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Ajouter</button>
              </div>
              {db.liens.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {db.liens.map((l) => {
                    const a = db.entites.find((e) => e.id === l.fromId), b = db.entites.find((e) => e.id === l.toId);
                    if (!a || !b) return null;
                    return (
                      <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs">
                        {a.nom} → {l.type}
                        <input
                          className="w-20 rounded border border-transparent bg-transparent px-1 text-[11px] text-slate-600 italic hover:border-slate-300 focus:border-slate-500 focus:outline-none"
                          placeholder="nom…"
                          defaultValue={l.nom || ""}
                          onBlur={(ev) => {
                            const v = ev.target.value.trim();
                            if (v !== (l.nom || "")) maj((d) => { const x = d.liens.find((y) => y.id === l.id); if (x) x.nom = v; return d; });
                          }}
                        />
                        → {b.nom}
                        <button onClick={() => supprimer("lien", l.id)} className="text-slate-400 hover:text-red-600">✕</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}

        {typeOnglet && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <Card>
                <h3 className="mb-3 font-semibold">{editingEntiteId ? "Modifier l'entité" : "Nouvelle entité · " + (TYPES_ENTITE.find((t) => t.code === typeOnglet) || {}).label}</h3>
                <div className="space-y-3">
                  <Field label="Type">
                    <select className={inputCls} value={formEntite.type}
                      onChange={(e) => setFormEntite({ ...formEntite, type: e.target.value })}>
                      {TYPES_ENTITE.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                  </Field>
                  {formEntite.type === "personne" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Prénom"><input className={inputCls} value={formEntite.prenom} onChange={(e) => setFormEntite({ ...formEntite, prenom: e.target.value })} /></Field>
                      <Field label="Nom"><input className={inputCls} value={formEntite.nom} onChange={(e) => setFormEntite({ ...formEntite, nom: e.target.value })} /></Field>
                    </div>
                  )}
                  {formEntite.type !== "personne" && (
                    <Field label={formEntite.type === "evenement" ? "Nom de l'événement" : "Nom"}><input className={inputCls} value={formEntite.nom} onChange={(e) => setFormEntite({ ...formEntite, nom: e.target.value })} /></Field>
                  )}
                  <Field label="Résumé"><textarea className={inputCls} rows={2} value={formEntite.resume} onChange={(e) => setFormEntite({ ...formEntite, resume: e.target.value })} /></Field>
                  {formEntite.type === "evenement" && (
                    <>
                      <Field label="Date et heure"><input type="datetime-local" className={inputCls} value={formEntite.dateHeure} onChange={(e) => setFormEntite({ ...formEntite, dateHeure: e.target.value })} /></Field>
                      <Field label="Lieu (texte)"><input className={inputCls} value={formEntite.lieu} onChange={(e) => setFormEntite({ ...formEntite, lieu: e.target.value })} /></Field>
                    </>
                  )}
                  {formEntite.type === "personne" && (
                    <Field label="Biographie"><textarea className={inputCls} rows={3} value={formEntite.biographie} onChange={(e) => setFormEntite({ ...formEntite, biographie: e.target.value })} /></Field>
                  )}
                  {formEntite.type === "lieu" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Latitude"><input className={inputCls} placeholder="48.85" value={formEntite.latitude} onChange={(e) => setFormEntite({ ...formEntite, latitude: e.target.value })} /></Field>
                      <Field label="Longitude"><input className={inputCls} placeholder="2.35" value={formEntite.longitude} onChange={(e) => setFormEntite({ ...formEntite, longitude: e.target.value })} /></Field>
                    </div>
                  )}
                  {(formEntite.type === "objet" || formEntite.type === "organisation") && (
                    <Field label="Description"><textarea className={inputCls} rows={3} value={formEntite.description} onChange={(e) => setFormEntite({ ...formEntite, description: e.target.value })} /></Field>
                  )}
                  <div className="flex gap-2">
                    <button onClick={sauverEntite} className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Enregistrer</button>
                    {editingEntiteId && (
                      <button onClick={() => { setFormEntite(emptyEntite()); setEditingEntiteId(null); }} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Annuler</button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
            <div className="space-y-3 lg:col-span-2">
              <div className="flex flex-wrap gap-2">
                {TYPES_ENTITE.map((t) => (
                  <button key={t.code} onClick={() => setOnglet("type-" + t.code)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${typeOnglet === t.code ? "text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    style={typeOnglet === t.code ? { backgroundColor: t.couleur } : {}}>
                    {t.icone} {db.entites.filter((e) => e.type === t.code).length} {t.label.toLowerCase()}
                  </button>
                ))}
              </div>
              {entiteSelectionnee && (
                <FicheEntite entite={entiteSelectionnee} db={db} onClose={() => setSelectedId(null)} onFusionDoublon={fusionnerEntites}
                  onEdit={() => { setFormEntite(structuredClone(entiteSelectionnee)); setEditingEntiteId(entiteSelectionnee.id); }} />
              )}
              {entiteSelectionnee && (
                <Card>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-800">🎯 Graphe de rang 1 — {entiteSelectionnee.prenom ? entiteSelectionnee.prenom + " " : ""}{entiteSelectionnee.nom}</h3>
                    <button onClick={() => { setModeRang1(true); setFiltreTypes(null); setOnglet("graphe"); }}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                      🧩 Basculer sur le schéma relationnel
                    </button>
                  </div>
                  <GrapheRelationnel db={db} onSelect={(id) => setSelectedId(id)} selectedId={selectedId} modeRang1={true} />
                  <p className="mt-2 text-xs text-slate-500">Voisins directs de l'entité sélectionnée. Basculez sur le schéma relationnel puis désactivez « 🎯 Rang 1 » pour élargir aux rangs suivants et créer d'autres liens.</p>
                </Card>
              )}
              <div className="space-y-2">
                {db.entites.filter((e) => e.type === typeOnglet).map((e) => (
                  <div key={e.id} className={`flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm ${selectedId === e.id ? "border-slate-800" : "border-slate-200"}`}
                    style={{ borderLeft: `4px solid ${couleurType(e.type)}` }}>
                    <button className="flex-1 text-left" onClick={() => setSelectedId(e.id)}>
                      <div className="font-semibold text-slate-800">{iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}</div>
                      <div className="text-sm text-slate-500">{e.resume || "—"}</div>
                    </button>
                    <button onClick={() => { setFormEntite(structuredClone(e)); setEditingEntiteId(e.id); }} className="rounded-lg bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200">✎</button>
                    <button onClick={() => supprimer("entite", e.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-red-600 hover:bg-red-50">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {onglet === "frise" && (
          <>
            <BarreFiltres filtreTypes={filtreTypes} setFiltreTypes={setFiltreTypes} modeRang1={null} setModeRang1={null} />
            <FriseChronologique db={dbFiltre} onSelect={(id) => setSelectedId(id)} />
          </>
        )}

        {onglet === "carte" && (
          <>
            <BarreFiltres filtreTypes={filtreTypes} setFiltreTypes={setFiltreTypes} modeRang1={null} setModeRang1={null} />
            <VueCarte db={dbFiltre} onSelect={(id) => setSelectedId(id)} />
          </>
        )}

        {onglet === "veilles" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Card>
                <h3 className="mb-3 font-semibold">Thématiques de veille</h3>
                <div className="mb-3 space-y-2">
                  <Field label="Nom de la veille"><input className={inputCls} value={formVeille.nom} onChange={(e) => setFormVeille({ ...formVeille, nom: e.target.value })} /></Field>
                  <Field label="Thématiques / mots-clés"><input className={inputCls} placeholder="ex. conflits, diplomatie, énergie" value={formVeille.thematiques} onChange={(e) => setFormVeille({ ...formVeille, thematiques: e.target.value })} /></Field>
                  <Field label="Durée de rétention des rapports">
                    <select className={inputCls} value={formVeille.retention} onChange={(e) => setFormVeille({ ...formVeille, retention: parseInt(e.target.value) })}>
                      {RETENTIONS.map((r) => <option key={r.jours} value={r.jours}>{r.label}</option>)}
                    </select>
                  </Field>
                  <button onClick={ajouterVeille} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Lancer la veille</button>
                </div>
                <div className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">＃ Créer une veille par hashtags</div>
                  <Field label="Hashtags (séparés par espaces ou virgules)">
                    <input className={inputCls} placeholder="ex. #sahel #mali #sécurité" value={formHashtags.tags} onChange={(e) => setFormHashtags({ ...formHashtags, tags: e.target.value })} />
                  </Field>
                  <Field label="Durée de rétention des rapports">
                    <select className={inputCls} value={formHashtags.retention} onChange={(e) => setFormHashtags({ ...formHashtags, retention: parseInt(e.target.value) })}>
                      {RETENTIONS.map((r) => <option key={r.jours} value={r.jours}>{r.label}</option>)}
                    </select>
                  </Field>
                  <button onClick={creerVeilleHashtags} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">＃ Créer la veille par hashtags</button>
                </div>
                <div className="space-y-2">
                  {db.veilles.map((v) => (
                    <div key={v.id} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                      <div className="flex-1">
                        <div className="font-semibold">🔎 {v.nom}</div>
                        <div className="text-xs text-slate-500">{v.thematiques} · créée le {v.creeeLe} · {db.rapports.filter((r) => r.veilleId === v.id).length} rapport(s)</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span>Rétention :</span>
                          <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={v.retention ?? 0}
                            onChange={(e) => maj((d) => { const x = d.veilles.find((y) => y.id === v.id); if (x) x.retention = parseInt(e.target.value); return d; })}>
                            {RETENTIONS.map((r) => <option key={r.jours} value={r.jours}>{r.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => actualiserVeille(v.id)} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">🔄 Actualiser</button>
                      <button onClick={() => supprimer("veille", v.id)} className="text-slate-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="mb-2 font-semibold">Légende de cotation OTAN</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-1 text-xs font-bold uppercase text-slate-500">Fiabilité de la source</h4>
                    <ul className="space-y-1 text-sm">
                      {FIABILITE.map((f) => <li key={f.code}><span className="font-mono font-bold">{f.code}</span> — {f.label}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-bold uppercase text-slate-500">Crédibilité de l'information</h4>
                    <ul className="space-y-1 text-sm">
                      {CREDIBILITE.map((c) => <li key={c.code}><span className="font-mono font-bold">{c.code}</span> — {c.label}</li>)}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <h3 className="mb-3 font-semibold">🐦 Ajouter une veille depuis une liste Twitter/X (privée)</h3>
                <p className="mb-3 text-xs text-slate-500">
                  Aucun accès direct à votre compte Twitter/X n'est possible (listes privées, authentification).
                  Collez les comptes de votre liste (alias et @handle par ligne) : la veille est créée et chaque compte devient une source à surveiller.
                </p>
                  <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Comptes de la liste (sources)</div>
                    <Field label="Nom de la liste">
                      <input className={inputCls} placeholder="ex. Veille Sahel…" value={formComptes.liste} onChange={(e) => setFormComptes({ ...formComptes, liste: e.target.value })} />
                    </Field>
                    <Field label="Comptes (un par ligne : « alias @handle » ou « @handle »)">
                      <textarea className={inputCls} rows={6} placeholder={"RFI Afrique @RFIAfrique\nJeune Afrique @JeuneAfrique"} value={formComptes.texte} onChange={(e) => setFormComptes({ ...formComptes, texte: e.target.value })} />
                    </Field>
                    <button onClick={importerComptes} className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">🐦 Créer la veille et ajouter les comptes</button>
                  </div>
              </Card>
              <Card>
                <h3 className="mb-3 font-semibold">Nouvelle source</h3>
                <div className="space-y-2">
                  <Field label="Nom de la source"><input className={inputCls} value={formSource.nom} onChange={(e) => setFormSource({ ...formSource, nom: e.target.value })} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Type">
                      <select className={inputCls} value={formSource.type} onChange={(e) => setFormSource({ ...formSource, type: e.target.value })}>
                        <option value="ouverte">Source ouverte</option>
                        <option value="fermee">Source fermée</option>
                      </select>
                    </Field>
                    <Field label="Fiabilité (A–F)">
                      <select className={inputCls} value={formSource.fiabilite} onChange={(e) => setFormSource({ ...formSource, fiabilite: e.target.value })}>
                        {FIABILITE.map((f) => <option key={f.code} value={f.code}>{f.code} — {f.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Rattachée à la veille">
                    <select className={inputCls} value={formSource.veilleId || ""} onChange={(e) => setFormSource({ ...formSource, veilleId: e.target.value || null })}>
                      <option value="">— Aucune —</option>
                      {db.veilles.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
                    </select>
                  </Field>
                  <Field label="Description"><input className={inputCls} value={formSource.description} onChange={(e) => setFormSource({ ...formSource, description: e.target.value })} /></Field>
                  <Field label="URL de la source (optionnel)"><input className={inputCls} placeholder="https://…" value={formSource.url || ""} onChange={(e) => setFormSource({ ...formSource, url: e.target.value })} /></Field>
                  <button onClick={ajouterSource} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Enregistrer la source</button>
                </div>
              </Card>
              <Card>
                <h3 className="mb-2 font-semibold">Sources enregistrées</h3>
                <div className="space-y-2">
                  {db.sources.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                      <div className="flex-1">
                        <div className="font-semibold">{s.nom} <Badge couleur={s.type === "fermee" ? "#dc2626" : "#0284c7"}>{s.type === "fermee" ? "fermée" : "ouverte"}</Badge></div>
                        <div className="text-xs text-slate-500">{s.description}</div>
                      </div>
                      <Badge couleur="#334155">Fiabilité {s.fiabilite}</Badge>
                      <button onClick={() => supprimer("source", s.id)} className="text-slate-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {onglet === "saisie" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-semibold">{editingRapportId ? "Modifier le rapport" : "Nouveau rapport d'information"}</h3>
              <div className="space-y-3">
                <Field label="Titre"><input className={inputCls} value={formRapport.titre} onChange={(e) => setFormRapport({ ...formRapport, titre: e.target.value })} /></Field>
                <Field label="Contenu de l'information (coller ici le texte d'une source ouverte/fermée)">
                  <textarea className={inputCls} rows={5} value={formRapport.contenu} onChange={(e) => setFormRapport({ ...formRapport, contenu: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Date de l'information"><input type="datetime-local" className={inputCls} value={formRapport.dateInfo} onChange={(e) => setFormRapport({ ...formRapport, dateInfo: e.target.value })} /></Field>
                  <Field label="Crédibilité (1–6)">
                    <select className={inputCls} value={formRapport.cotationInfo} onChange={(e) => setFormRapport({ ...formRapport, cotationInfo: e.target.value })}>
                      {CREDIBILITE.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={formRapport.creerEvenement !== false}
                    onChange={(e) => setFormRapport({ ...formRapport, creerEvenement: e.target.checked })} />
                  📅 Créer automatiquement l'événement correspondant (si rattaché à une veille)
                </label>
                <Field label="Source">
                    <select className={inputCls} value={formRapport.sourceId || ""} onChange={(e) => setFormRapport({ ...formRapport, sourceId: e.target.value || null })}>
                      <option value="">— Aucune —</option>
                      {db.sources.map((s) => <option key={s.id} value={s.id}>{s.nom} ({s.fiabilite})</option>)}
                    </select>
                  </Field>
                  <Field label="Veille">
                    <select className={inputCls} value={formRapport.veilleId || ""} onChange={(e) => setFormRapport({ ...formRapport, veilleId: e.target.value || null })}>
                      <option value="">— Aucune —</option>
                      {db.veilles.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Informations à coter individuellement (crédibilité 1–6)">
                  <div className="space-y-2">
                    {formRapport.informations.map((info, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input className={inputCls} placeholder={`Information n°${idx + 1}`}
                          value={info.texte}
                          onChange={(e) => setFormRapport({
                            ...formRapport,
                            informations: formRapport.informations.map((x, i) => i === idx ? { ...x, texte: e.target.value } : x),
                          })} />
                        <select className="rounded-lg border border-slate-300 px-2 text-sm"
                          value={info.cotation}
                          onChange={(e) => setFormRapport({
                            ...formRapport,
                            informations: formRapport.informations.map((x, i) => i === idx ? { ...x, cotation: e.target.value } : x),
                          })}>
                          {CREDIBILITE.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select>
                        <button onClick={() => setFormRapport({ ...formRapport, informations: formRapport.informations.filter((_, i) => i !== idx) })}
                          className="rounded-lg bg-slate-100 px-2 text-xs text-red-600 hover:bg-red-50">✕</button>
                      </div>
                    ))}
                    <button onClick={() => setFormRapport({ ...formRapport, informations: [...formRapport.informations, { texte: "", cotation: "3" }] })}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300">+ Ajouter une information</button>
                  </div>
                </Field>
                <Field label="Entités mentionnées">
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {db.entites.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formRapport.entitesIds.includes(e.id)}
                          onChange={(ev) => setFormRapport({
                            ...formRapport,
                            entitesIds: ev.target.checked ? [...formRapport.entitesIds, e.id] : formRapport.entitesIds.filter((x) => x !== e.id),
                          })} />
                        {iconeType(e.type)} {e.prenom ? e.prenom + " " : ""}{e.nom}
                      </label>
                    ))}
                  </div>
                </Field>
                <div className="flex items-center gap-3">
                  <button onClick={ajouterRapport} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Enregistrer</button>
                  {formRapport.sourceId && <span>Cotation : <CotationBadge source={db.sources.find((s) => s.id === formRapport.sourceId) ? db.sources.find((s) => s.id === formRapport.sourceId).fiabilite : undefined} info={formRapport.cotationInfo} /></span>}
                  {editingRapportId && <button onClick={() => { setEditingRapportId(null); setFormRapport({ titre: "", contenu: "", dateInfo: "", cotationInfo: "3", sourceId: null, veilleId: null, entitesIds: [], informations: [] }); }} className="text-sm text-slate-500 underline">Annuler la modification</button>}
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="mb-2 font-semibold">Rapports enregistrés</h3>
              <div className="space-y-2">
                {db.rapports.map((r) => {
                  const src = db.sources.find((s) => s.id === r.sourceId);
                  const veilleRapport = db.veilles.find((v) => v.id === r.veilleId);
                  return (
                    <div key={r.id} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <button className="flex-1 text-left font-semibold hover:underline" onClick={() => setRapportOuvert(r.id)}>{r.titre}</button>
                        <CotationBadge source={src ? src.fiabilite : undefined} info={r.cotationInfo} />
                        <button onClick={() => { setFocusDoublon(r.id); setOnglet("doublons"); }}
                          className="text-slate-400 hover:text-amber-600" title="Vérifier les doublons de ce rapport">♻️</button>
                        <button onClick={() => supprimer("rapport", r.id)} className="text-slate-400 hover:text-red-600">✕</button>
                        <button onClick={() => {
                          setFormRapport({ titre: r.titre, contenu: r.contenu, dateInfo: r.dateInfo, cotationInfo: r.cotationInfo, sourceId: r.sourceId, veilleId: r.veilleId, entitesIds: [...r.entitesIds], informations: (r.informations || []).map((x) => ({ ...x })) });
                          setEditingRapportId(r.id);
                        }} className="text-slate-400 hover:text-slate-800">✎</button>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{r.contenu}</div>
                      {(r.informations || []).length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {(r.informations || []).map((info, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <CotationBadge source={src ? src.fiabilite : undefined} info={info.cotation} />
                              <span>{info.texte}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-1 text-xs text-slate-400">
                        {r.dateInfo.replace("T", " ")} · {src ? src.nom : "source non précisée"} · Veille : {veilleRapport ? veilleRapport.nom : "non rattachée"} · {r.entitesIds.length} entité(s)
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {onglet === "sources" && (
          <Card>
            <h3 className="mb-1 font-semibold">📚 Sources — évaluation et suivi</h3>
            <p className="mb-3 text-sm text-slate-500">Ajustez la fiabilité OTAN (A–F) de chaque source ; la modification s'applique instantanément à tous les rapports associés.</p>
            <div className="space-y-2">
              {db.sources.map((s) => {
                const veille = db.veilles.find((v) => v.id === s.veilleId);
                const nbRapports = db.rapports.filter((r) => r.sourceId === s.id).length;
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{s.nom}</span>
                        <Badge couleur={s.type === "fermee" ? "#dc2626" : "#0284c7"}>{s.type === "fermee" ? "fermée" : "ouverte"}</Badge>
                        {veille && <Badge couleur="#7c3aed">🔎 {veille.nom}</Badge>}
                        <Badge couleur="#334155">{nbRapports} rapport(s)</Badge>
                      </div>
                      <div className="text-xs text-slate-500">{s.description}</div>
                      {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">Accéder à la source</a>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Fiabilité :</span>
                      <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={s.fiabilite}
                        onChange={(e) => majSource(s.id, (x) => { x.fiabilite = e.target.value; })}>
                        {FIABILITE.map((f) => <option key={f.code} value={f.code}>{f.code} — {f.label}</option>)}
                      </select>
                      <Badge couleur="#334155">{s.fiabilite}</Badge>
                    </div>
                    <button onClick={() => supprimer("source", s.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-red-600 hover:bg-red-50">✕</button>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="font-medium text-slate-600">Répartition des fiabilités :</span>
              {FIABILITE.map((f) => (
                <Badge key={f.code} couleur="#334155">{f.code} : {db.sources.filter((s) => s.fiabilite === f.code).length}</Badge>
              ))}
            </div>
          </Card>
        )}

        {onglet === "donnees" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-semibold">Statistiques</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.veilles.length}</div>Veilles</div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.sources.length}</div>Sources</div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.rapports.length}</div>Rapports</div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.entites.length}</div>Entités</div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.liens.length}</div>Liens</div>
                <div className="rounded-lg bg-slate-50 p-3"><div className="text-2xl font-bold">{db.entites.filter((e) => e.type === "evenement").length}</div>Événements</div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Les données sont sauvegardées automatiquement dans le navigateur (stockage local).</p>
            </Card>
            <Card>
              <h3 className="mb-3 font-semibold">Import / Export</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={exporterJSON} className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">⬇ Export JSON (base complète)</button>
                  <button onClick={exporterCSV} className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">⬇ Export CSV (entités)</button>
                </div>
                <Field label="Importer un fichier (JSON issu d'un export)">
                  <input type="file" accept=".json,application/json" onChange={onFichier} className={inputCls} />
                </Field>
                <Field label="… ou coller du JSON">
                  <textarea className={inputCls} rows={4} value={importText} onChange={(e) => setImportText(e.target.value)} />
                </Field>
                <button onClick={() => importer(importText)} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300">Importer</button>
              </div>
            </Card>
                        <Card className="md:col-span-2">
              <h3 className="mb-3 font-semibold">🔄 Base de référence (dépôt GitHub)</h3>
              <p className="mb-3 text-sm text-slate-600">
                L'application consulte automatiquement, à chaque ouverture, la base de référence du dépôt GitHub.
                Si la version en ligne est plus récente que vos données locales, une bannière propose de la charger.
                L'application reste pleinement fonctionnelle hors ligne.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={chargerBaseRef} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Charger la base de référence</button>
                <button onClick={verifierBaseRef} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300">Revérifier maintenant</button>
                {baseRef && baseRef.sauvegardeLe && (
                  <Badge couleur="#0284c7">Version en ligne : {baseRef.sauvegardeLe.replace("T", " ").slice(0, 16)}</Badge>
                )}
                {etatBaseRef === "attente" && <span className="text-xs text-slate-500">Vérification en cours…</span>}
                {etatBaseRef === "erreur" && <span className="text-xs text-red-600">Dépôt injoignable (hors ligne ?) — l'application fonctionne avec les données locales.</span>}
              </div>
            </Card>
</div>
        )}
        {onglet === "doublons" && (
          <PageDoublons db={db} maj={maj} onOuvrirRapport={setRapportOuvert} setMessage={setMessage}
            focusId={focusDoublon} onClearFocus={() => setFocusDoublon(null)} />
        )}
      </main>
    </div>
  );
}