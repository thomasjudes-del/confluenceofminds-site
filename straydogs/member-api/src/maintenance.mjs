/** Privileged maintenance only. Not imported by the public Worker and not an HTTP endpoint.
 * Run with an already-authorized D1 binding after reviewing the operation and target.
 * No provider calls, secrets, credentials, email delivery or implicit provisioning.
 */
function id(value) { if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(value))throw new Error('INVALID_TARGET_ID');return value; }
const query=(db,sql,...values)=>db.prepare(sql).bind(...values);
const changed=row=>Number(row?.meta?.changes||0)>0;
export function createMaintenance(db,{now=()=>Math.floor(Date.now()/1000)}={}) {
  if(!db?.prepare||!db?.batch)throw new Error('D1_BINDING_REQUIRED');
  if(typeof db.withSession==='function')db=db.withSession('first-primary');
  return {
    async admitApplication(applicationId,{publishProfile=false}={}) {
      id(applicationId);if(typeof publishProfile!=='boolean')throw new Error('EXPLICIT_PUBLICATION_CHOICE_REQUIRED');
      const memberId=crypto.randomUUID(),timestamp=now();
      // Every statement is conditional on the same still-pending application and newly created member.
      // A concurrent rejection/admission cannot create an orphan public profile.
      const rows=await db.batch([
        query(db,`INSERT OR IGNORE INTO members(id,email,display_name,status,session_version,created_at) SELECT ?,a.email,json_extract(a.public_data,'$.name'),'approved',1,? FROM applications a WHERE a.id=? AND a.status='pending' AND NOT EXISTS(SELECT 1 FROM members WHERE email=a.email)`,memberId,timestamp,applicationId),
        query(db,`INSERT INTO member_profiles(member_id,public_data,consent_public,approved_at,updated_at) SELECT m.id,a.public_data,CASE WHEN json_extract(a.consent_data,'$.publicProfile')=1 AND ?=1 THEN 1 ELSE 0 END,?,? FROM applications a JOIN members m ON m.email=a.email WHERE a.id=? AND a.status='pending' AND m.id=?`,publishProfile?1:0,timestamp,timestamp,applicationId,memberId),
        query(db,`UPDATE applications SET status='approved' WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM members WHERE id=? AND email=applications.email)`,applicationId,memberId)
      ]);
      if(!changed(rows[0])||!changed(rows[2]))return {status:'not_pending_or_already_admitted'};
      const profile=await query(db,'SELECT consent_public FROM member_profiles WHERE member_id=?',memberId).first();
      return {status:'admitted',memberId,published:profile?.consent_public===1};
    },
    async rejectApplication(applicationId) {
      id(applicationId);const row=await query(db,"UPDATE applications SET status='rejected' WHERE id=? AND status='pending'",applicationId).run();return {changed:changed(row)};
    },
    async approveProfile(submissionId) {
      id(submissionId);const timestamp=now();
      const rows=await db.batch([
        query(db,`INSERT INTO member_profiles(member_id,public_data,consent_public,approved_at,updated_at) SELECT p.member_id,p.public_data,p.consent_public,?,? FROM profile_submissions p JOIN members m ON m.id=p.member_id WHERE p.id=? AND p.status='pending' AND m.status='approved' ON CONFLICT(member_id) DO UPDATE SET public_data=excluded.public_data,consent_public=excluded.consent_public,approved_at=excluded.approved_at,updated_at=excluded.updated_at`,timestamp,timestamp,submissionId),
        query(db,`UPDATE profile_submissions SET status='approved' WHERE id=? AND status='pending' AND member_id IN(SELECT id FROM members WHERE status='approved')`,submissionId)
      ]);return {changed:changed(rows[0])&&changed(rows[1])};
    },
    async rejectProfile(submissionId) {
      id(submissionId);const row=await query(db,"UPDATE profile_submissions SET status='rejected' WHERE id=? AND status='pending'",submissionId).run();return {changed:changed(row)};
    },
    async withdrawProfile(memberId) {
      id(memberId);const timestamp=now();const rows=await db.batch([
        query(db,'UPDATE member_profiles SET consent_public=0,updated_at=? WHERE member_id=?',timestamp,memberId),
        query(db,"UPDATE profile_submissions SET consent_public=0 WHERE member_id=? AND status='pending'",memberId)
      ]);return {changed:rows.some(changed)};
    },
    async suspendMember(memberId) {
      id(memberId);const timestamp=now();const rows=await db.batch([
        query(db,"UPDATE members SET status='suspended',session_version=session_version+1 WHERE id=?",memberId),
        query(db,'UPDATE sessions SET revoked_at=? WHERE member_id=? AND revoked_at IS NULL',timestamp,memberId),
        query(db,'DELETE FROM otp_challenges WHERE member_id=?',memberId)
      ]);return {changed:changed(rows[0])};
    },
    async revokeSessions(memberId) {
      id(memberId);const timestamp=now();const rows=await db.batch([
        query(db,'UPDATE members SET session_version=session_version+1 WHERE id=?',memberId),
        query(db,'UPDATE sessions SET revoked_at=? WHERE member_id=? AND revoked_at IS NULL',timestamp,memberId),
        query(db,'DELETE FROM otp_challenges WHERE member_id=?',memberId)
      ]);return {changed:changed(rows[0])};
    },
    async purgeExpired() {
      const timestamp=now();const rows=await db.batch([
        query(db,'DELETE FROM otp_challenges WHERE expires_at<=?',timestamp),
        query(db,'DELETE FROM sessions WHERE expires_at<=? OR (revoked_at IS NOT NULL AND revoked_at<=?)',timestamp,timestamp-86400),
        query(db,'DELETE FROM rate_limits WHERE expires_at<=?',timestamp)
      ]);return {otp:Number(rows[0].meta.changes),sessions:Number(rows[1].meta.changes),rateLimits:Number(rows[2].meta.changes)};
    }
  };
}
