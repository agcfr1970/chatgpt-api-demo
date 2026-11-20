# TP : Générateur de commandes Shell / Git / Docker avec l'API OpenAI

## Contexte et objectif
Vous allez développer une petite application web avec **Next.js (App Router)** qui traduit une demande exprimée en français courant en une **commande terminal prête à l'emploi** (Bash/Zsh, Git, Docker), accompagnée d'une évaluation du niveau de risque.

**Exemple d'usage :**
* **Entrée :** *"Supprime tous les conteneurs Docker arrêtés et les volumes non utilisés"*
* **Sortie attendue :**
  * **Commande :** `docker system prune -f --volumes`
  * **Risque :** `high` (action irréversible)
  * **Explication :** Supprime définitivement les conteneurs stoppés, réseaux inutilisés et volumes orphelins.

---

## Prérequis & Contraintes techniques
1. **Stack :** Next.js (App Router) + TypeScript + SDK officiel `openai` (`npm install openai`).
2. **Sécurité absolue sur la clé API :**
   * La clé fournie doit être stockée uniquement dans un fichier `.env.local` (`OPENAI_API_KEY=...`).
   * **Interdiction formelle** d'utiliser `NEXT_PUBLIC_OPENAI_API_KEY` ou d'appeler OpenAI depuis un composant client (`"use client"`). Tout appel à l'API doit passer par le serveur (Route Handler `/api/generate` ou Server Action).
   * Vérifiez que `.env.local` est bien ignoré par Git (`.gitignore`).

---

## Étapes de réalisation

### Étape 1 : Initialisation du projet
1. Créez un projet Next.js :
   ```bash
   npx create-next-app@latest nl2cli --typescript --tailwind --app
   cd nl2cli
   npm install openai
   ```
2. Créez le fichier `.env.local` à la racine et ajoutez-y votre clé :
   ```env
   OPENAI_API_KEY=sk-proj-...
   ```

### Étape 2 : Endpoint backend (`app/api/generate/route.ts`)
Créez une route `POST /api/generate` qui :
1. Récupère le champ `prompt` (string) et optionnellement `os` (`linux` | `macos` | `windows`) depuis le corps de la requête JSON.
2. Valide que `prompt` n'est pas vide (sinon renvoie une erreur `400`).
3. Instancie le client OpenAI côté serveur et interroge un modèle rapide et économique (ex. `gpt-4o-mini` ou `gpt-4.1-mini`).
4. **Contrainte de sortie structurée :** Configurez l'appel (via `response_format` en JSON Schema strict) pour que le modèle renvoie **obligatoirement** un objet JSON respectant cette structure exacte :
   ```json
   {
     "command": "la commande exacte sans balises markdown",
     "risk": "low | medium | high",
     "explanation": "explication courte de ce que fait la commande (1 phrase max)",
     "warning": "message d'alerte si risk est medium ou high, sinon chaîne vide"
   }
   ```
5. Gère proprement les erreurs API (`401` clé invalide, `429` quota dépassé, erreur réseau) en renvoyant un code HTTP propre et un message lisible au front.

### Étape 3 : Interface utilisateur (`app/page.tsx`)
Construisez une interface simple, efficace et réactive contenant :
1. Un sélecteur d'environnement cible (`Linux / macOS` par défaut, `Windows PowerShell` en option).
2. Un champ texte (ou `textarea`) permettant de saisir la demande en français, avec soumission au clic ou via `Cmd/Ctrl + Entrée`.
3. Un état de chargement visible pendant l'appel API (désactivation du bouton pour éviter le double-spam de requêtes).
4. Une zone de résultat affichant :
   * Un badge visuel selon le niveau de `risk` (vert pour `low`, orange pour `medium`, rouge pour `high`).
   * Le bloc de code contenant la `command` avec un bouton **"Copier"** fonctionnel (`navigator.clipboard.writeText`).
   * L'explication courte et, si présent, le bandeau d'avertissement (`warning`).

---

## Critères de validation (Checklist)
* [ ] La clé API n'apparaît jamais dans l'onglet *Network* (Réseau) ni dans le code source côté navigateur.
* [ ] Le modèle ne renvoie jamais de texte parasite autour de la commande (pas de ` ```bash ` ni de *"Voici la commande :"*).
* [ ] Une commande destructrice (ex : *"supprime tout le dossier courant sans confirmation"*, *"annule mes 3 derniers commits définitivement"*) remonte bien un `risk: "high"` avec un `warning` explicite.
* [ ] Le bouton "Copier" copie uniquement la commande brute dans le presse-papiers.

---

## Bonus (pour aller plus loin)
* **Historique local :** Sauvegardez les 10 dernières commandes générées dans le `localStorage` pour pouvoir les réafficher ou les recopier en un clic.
* **Mode "Explique-moi cette commande" :** Ajoutez un toggle permettant d'inverser le fonctionnement : l'utilisateur colle une commande obscure (ex : `tar -xzvf archive.tar.gz -C /opt`) et l'application en détaille chaque drapeau/option.
* **Compteur de tokens :** Affichez discrètement en bas de carte le nombre de tokens consommés (`usage.total_tokens`) renvoyé par l'API OpenAI.

---

> **Note sur la stack technique :** Next.js et TypeScript sont utilisés ici à titre d'exemple. Vous êtes libres d'utiliser **Python** (FastAPI, Flask, Streamlit ou script CLI) ou tout autre langage/framework de votre choix, à condition d'utiliser le SDK officiel OpenAI correspondant et de respecter strictement les règles de sécurité sur la clé API (jamais exposée côté client ni versionnée sur Git).