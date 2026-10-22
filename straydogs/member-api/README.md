# StrayDogs API — backend alpha isolé

**Code réel, non déployé.** Aucun compte, Worker, base D1, secret, domaine ou abonnement n’a été créé. Aucune requête réseau réelle ni aucun email n’a été envoyé par les tests. L’API n’active rien par défaut et ne contient aucune fixture de production.

Le fournisseur d’envoi Resend existe déjà : `confluenceofminds.com` est vérifié. Cela ne signifie pas qu’un identifiant d’envoi soit disponible dans le runtime. Aucun backend actif attribué à StrayDogs n’a été identifié dans Supabase/Neon ; les ressources d’autres projets ne sont pas réutilisées ici.

## Ce que couvre ce bloc

- Candidature privée, consentements séparés et horodatés, aucune admission ni publication automatique.
- Code email réservé aux membres **déjà admis** ; session vérifiée et révocable.
- Lecture de sa fiche et soumission de modifications à relecture.
- Annuaire public limité aux instantanés approuvés, consentis, de membres admis.
- Retrait du consentement public immédiatement appliqué à l’ancienne fiche.
- Notification équipe facultative, asynchrone, limitée à la référence de candidature ; état envoyé/échoué conservé.

**Non couvert :** interface web administrateur et validation réelle du chemin distant de maintenance, uploads, œuvres/rondes/collaborations, récupération ou changement d’email, suppression/export de compte et politique de conservation. Ces fonctions doivent rester désactivées ou clairement distinctes d’une démo tant que leurs vrais endpoints n’existent pas.

## Contrat frontend

Toutes les dates sont des secondes Unix. Les mutations exigent `Content-Type: application/json`, une origine HTTPS exactement autorisée et un corps de moins de 12 Kio. Aucun cookie n’est utilisé. Les réponses privées sont `Cache-Control: no-store`.

### `POST /v1/applications`

Champs :

```
email, name, universe, discipline, projectTitle,
projectUrl?, website?, socialType?, socialUrl?, visualUrl?,
interests[], audienceChannel, audience,
publicConsent: boolean, privacyConsent: true, charter: true
```

- `discipline` : `image | words | sound | film | interactive | other`.
- `interests` : 1 à 4 valeurs parmi `imaginary | urban | nature | sound`.
- `universe` : 20–600 caractères ; nom 1–80 ; titre 1–120.
- `visualUrl` est un **lien HTTPS choisi**, pas un upload. Le Worker ne le télécharge pas. Sa publication dépend de la revue et du consentement ; l’afficher dans le navigateur peut contacter l’hébergeur de l’image.
- `visual`, `attachment`, `photo` et `files` non vides sont rejetés : `UPLOADS_UNAVAILABLE`.
- Public/privé sont stockés dans des colonnes distinctes. Audience et email n’apparaissent jamais dans l’annuaire.
- `202 {"status":"received"}` signifie réception du formulaire, **pas email envoyé**, admission ou publication. Une répétition en attente donne la même réponse sans deuxième candidature.

### `POST /v1/auth/request-code`

`{"email":"…"}` → `202 {"status":"accepted","retryAfterSeconds":60}` pour une adresse inconnue, suspendue ou admise. Seuls les admis reçoivent un code. Afficher : « Si cette adresse correspond à un membre admis, un code vous a été envoyé. » Ne jamais affirmer qu’un compte existe ou qu’un email est effectivement livré.

Le code à **huit chiffres** expire après 10 minutes ; 60 secondes entre émissions ; 3 demandes/email/heure et 12/IP/heure. Les limites concernent aussi les adresses inconnues. Un renvoi remplace le précédent défi.

### `POST /v1/auth/verify-code`

`{"email":"…","code":"12345678"}` →

```
200 { token, expiresAt, member: { id, name, status: "approved" } }
401 { error: "INVALID_OR_EXPIRED_CODE" }
```

Le code n’est jamais renvoyé par l’API. Cinq essais maximum par défi ; limites supplémentaires de vérification par IP/email. La consommation et l’émission de session sont une transaction D1 : deux vérifications concurrentes ne produisent qu’une session.

**Frontend : garder `token` en mémoire uniquement**, jamais URL, localStorage, sessionStorage ou cookie JavaScript. Recharger oblige à demander un nouveau code : limite explicite de cette alpha. Envoyer `Authorization: Bearer <token>` aux routes privées. À `401`, vider la mémoire et revenir à la connexion. Durée de session : deux heures, sans refresh token.

### `GET /v1/me`

```
{
  member: { id, email, name, status },
  profile: { ...publicFields, publicConsent, approvedAt } | null,
  submission: { id, ...publicFields, publicConsent, status, createdAt } | null,
  candidate: { ...publicFields, publicConsent, audienceChannel, audience } | null
}
```

`candidate` : dernier brouillon en attente, sinon dernière proposition, sinon fiche approuvée. Si aucune fiche n’existe, il vaut `null` ; initialiser le nom avec `member.name`. L’email privé reste dans `member.email`. `candidate.audienceChannel` et `candidate.audience` proviennent uniquement de la candidature approuvée de ce membre ; jamais du profil public. Ils sont en lecture seule dans cette version. Le membre connecté ne peut lire aucune donnée d’un autre.

### `PATCH /v1/me/profile`

Envoyer **l’ensemble** des champs publics du formulaire, pas un patch partiel, et `publicConsent: boolean`. Les champs email/audience ne sont pas modifiés par cette route. Réponse : `202 {"status":"pending_review","submissionId":"…"}`.

Le brouillon remplace la proposition précédente en attente, pas la fiche publique. `publicConsent:false` retire immédiatement la fiche publique ; `true` ne publie rien sans nouvelle approbation.

### `GET /v1/members`

Public : `200 {members:[{id,...publicFields}]}`. `publicFields` : `name, universe, discipline, projectTitle, projectUrl, website, socialType, socialUrl, interests, visualUrl`. Maximum 100 fiches dans cette alpha. Liste vide si personne n’est publié ; aucun membre fictif de secours.

### `POST /v1/logout`

Bearer requis → `204`, session révoquée. Le frontend doit effacer son token même si le réseau échoue ; l’ancien token expire au plus tard après deux heures. Une suspension ou un incrément de `members.session_version` invalide également les sessions.

### Erreurs communes

- `422` : champs/consentements/liens invalides ; ne pas présenter cela comme reçu.
- `429 RATE_LIMITED` : attendre avant de recommencer, sans boucle automatique.
- `503 SERVICE_NOT_CONFIGURED`, `EMAIL_NOT_CONFIGURED`, `TRUSTED_EDGE_REQUIRED` : dépendance non raccordée ; pas de faux succès ou de bascule silencieuse en mode démo.
- `503 SERVICE_UNAVAILABLE` : panne interne sans détail sensible exposé.

## Activation : seulement après accord de périmètre et coûts

1. Choisir un Worker et une base **dédiés à StrayDogs**, les autoriser et vérifier leurs coûts. Aucune ressource RALUVAAA, Omirel ou Kaos n’est utilisée.
2. Appliquer `schema.sql` à cette base isolée, après revue. Il n’y a aucun membre préchargé.
3. Configurer le binding `DB`, l’origine exacte de chaque frontend autorisé, l’expéditeur choisi et une clé Resend serveur autorisée. Ne pas créer une clé ou élargir une clé existante sans accord.
4. Fournir `OTP_HMAC_SECRET`, valeur indépendante à forte entropie d’au moins 32 octets, exclusivement dans le runtime sécurisé. La rotation invalide les sessions et défis existants. Le fichier exemple ne génère rien.
5. Garder `LIVE_ENABLED=false` jusqu’aux tests de l’environnement isolé. `workers_dev=false` évite une URL publique implicite ; aucune route n’est configurée par l’exemple.
6. Le module privé `src/maintenance.mjs` exécute admission et revue par transactions D1. Le raccordement à un contexte d’administration autorisé reste à réaliser : aucun endpoint admin public n’est fourni. Aucun navigateur ne peut s’octroyer un rôle ou approuver sa propre fiche. Voir le protocole de maintenance ci-dessous.
7. Tester de bout en bout avec un destinataire explicitement autorisé : réception réelle, mauvais code, expiration, renvoi, rejeu, suspension, modification, retrait et déconnexion. Test de sauvegarde/restauration, purge des données, revue de sécurité, protections anti-abus/WAF et contrôle des dépenses avant ouverture générale.

Les tables d’authentification portent des dates d’expiration, mais **aucune purge automatique n’est déployée**. Le module `purgeExpired()` est testé ; son invocation régulière reste à raccorder. Prévoir une tâche de nettoyage des défis/sessions/compteurs expirés et une politique de conservation des candidatures avant production. L’envoi OTP est asynchrone : en cas d’échec fournisseur, aucune session n’est créée et l’utilisateur peut redemander après le délai ; il n’y a pas de file de retry automatique. Les notifications équipe échouées sont repérables en base.

## Maintenance privée — aucune route administrateur publique

`src/maintenance.mjs` exporte `createMaintenance(DB)`. L’appelant doit déjà posséder un binding D1 autorisé dans un contexte de maintenance privilégié ; le frontend ne peut pas importer ni invoquer cette capacité à distance. L’outil ne demande ou ne génère aucune clé. **Aucun chemin d’exécution distant n’a été déployé** : il faut le raccorder explicitement à l’environnement d’administration autorisé, pas transformer ce module en endpoint anonyme.

Opérations disponibles, toutes paramétrées :

- `admitApplication(applicationId, {publishProfile:false})` : seulement une candidature encore en attente. Crée le membre et son instantané relu dans la même transaction, puis marque la candidature approuvée. La publication demande **à la fois** `publishProfile:true` explicite et l’accord d’affichage enregistré du candidat. Par défaut, admission sans exposition publique. Ne réactive pas un membre suspendu.
- `rejectApplication(applicationId)` : seulement une candidature en attente ; n’efface ni ne révoque un membre déjà admis.
- `approveProfile(submissionId)` / `rejectProfile(submissionId)` : seulement la proposition encore en attente ; une proposition remplacée ou un membre suspendu ne peut être publié par une action périmée. Le consentement de la proposition demeure obligatoire.
- `withdrawProfile(memberId)` : retire le profil public et retire aussi l’accord de publication des brouillons en attente, pour empêcher une republication involontaire.
- `suspendMember(memberId)` : suspend l’accès, invalide la version de session, révoque les sessions et supprime les codes en cours. Le profil disparaît du répertoire grâce au filtre d’admission.
- `revokeSessions(memberId)` : invalide toutes les sessions et codes sans retirer l’admission.
- `purgeExpired()` : supprime les défis, sessions et compteurs expirés, jamais les candidatures, membres ou profils. Aucun déclencheur n’est créé dans cette livraison.

Avant une admission ou publication réelle : l’opérateur examine la candidature, son consentement et la destination, utilise l’identifiant exact, puis vérifie le résultat. Les doublons, refus concurrents et échecs intermédiaires sont testés ; aucune donnée de test n’est utilisée en production. Le workflow actuel reste **modéré**, pas automatique.

## Vérifications locales

```
npm test
npm run check
```

Node 24+, aucune dépendance à télécharger. Le test utilise le SQLite intégré à Node pour exécuter le vrai schéma et les vraies requêtes, avec une façade D1 et un mailer mémoire. Le Worker de production n’importe ni les fixtures ni le mailer de test.

**55 tests passent**, dont concurrence, limites, expiration, usage unique, accès propriétaire, consentement, absence de fuite privée, retrait, injection SQL et configuration absente. Syntaxe vérifiée. Aucun test sur Cloudflare déployé, aucun envoi Resend réel ni audit indépendant : ne pas qualifier ce bloc de production-ready.

Références vérifiées : [transactions D1](https://developers.cloudflare.com/d1/worker-api/d1-database/), [requêtes préparées D1](https://developers.cloudflare.com/d1/worker-api/prepared-statements/), [Web Crypto Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/), [envoi Resend](https://resend.com/docs/send-with-nodejs).

## Opérations administratives manuelles — préparées, non exécutées

`tools/admin.mjs` raccorde le module `maintenance.mjs` à l’[API D1 officielle](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) via des requêtes paramétrées et un unique batch par transaction logique. Ce chemin est testé avec réponses interceptées, **pas encore vérifié contre le service distant**. Ce n’est pas une interface web d’administration.

Prérequis avant toute utilisation : autorisation explicite de l’opération et de la base dédiée ; environnement opérateur de confiance ; variables serveur `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `STRAYDOGS_D1_DATABASE_ID` et `STRAYDOGS_ADMIN_CONFIRM=authorised-straydogs-only`. Aucune de ces valeurs n’est à placer dans le frontend, un commit ou une conversation. Le script vérifie d’abord la marque `straydogs-members-v1` dans la base ; sans elle, aucun changement métier n’est exécuté. Il ne crée ni ressource ni clé.

Opérations : `pending`, `review-application ID`, `review-profile ID`, `admit ID [--publish]`, `reject-application ID`, `approve-profile ID`, `reject-profile ID`, `withdraw MEMBER_ID`, `suspend MEMBER_ID`, `revoke MEMBER_ID`, `purge`.

Les opérations de lecture exigent `STRAYDOGS_PRIVATE_REVIEW_FILE`, un fichier local nouveau créé en mode 0600. Ne pas le joindre à un artifact CI public. Les logs ne contiennent ni email ni fiche ; seuls statut, nombre et identifiants opaques d’opération peuvent être affichés. L’admission ne publie qu’avec `--publish` **et** le consentement déjà enregistré. Aucun email d’admission automatique : l’opérateur doit informer le membre par le canal autorisé ou prévoir ensuite ce vrai envoi.

Les six tests supplémentaires couvrent la confirmation obligatoire, le refus avant vérification de cible, la mauvaise base, les paramètres séparés, le batch unique et l’absence de données sensibles dans les erreurs. La revue/admission distante reste un prérequis à valider sur l’environnement isolé avant ouverture des candidatures.
