# Backend QA — 22 octobre 2026

- `npm test` : 55 tests réussis, 0 échec, 0 ignoré.
- `npm run check` : syntaxe Worker et module maintenance valide.
- Node 24.19.0, SQLite intégré en mémoire ; aucune dépendance externe installée.
- Vrai schéma SQL et vraies requêtes paramétrées, transactions émulées par SQLite ; façade D1 test seulement.
- Fournisseur d’email injecté et capturé en mémoire. Aucune requête réseau ni aucun email réel.
- Vérification concurrente : une seule session. Admission concurrente : un seul membre. Erreur de profil : rollback complet.
- OTP huit chiffres, TTL 10 min, cooldown, limites IP/email, cinq essais, HMAC ; expiration et révocation couvertes.
- Public/privé, consentement, refus, brouillons périmés, retrait, contrôles propriétaire et purge TTL couverts.
- Production : zéro fixture, zéro secret réel, activation désactivée, aucune route ni ressource provisionnée.

Limites : pas de runtime Cloudflare/workerd exécuté, pas de base D1 distante, pas d’envoi Resend réel, pas d’audit indépendant, pas de chemin d’administration distant raccordé. Les tests ne prouvent pas un déploiement fonctionnel. Activation et ressources demeurent en attente d’autorisation.

Complément : six tests du raccordement administratif HTTP intercepté + deux tests du flag notification admin ; total 63. Aucun appel distant exécuté.
