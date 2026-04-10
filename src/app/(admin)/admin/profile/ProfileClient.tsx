"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ArrowLeft } from "lucide-react";
import { updateAvatarAction, changePasswordAction } from "@/actions/profile-actions";
import type { CloudinaryUploadResult, SignedUploadParams } from "@/lib/cloudinary";
import classes from "./profile.module.css";

/* ── Cloudinary upload ───────────────────────────────────────────────────── */
async function uploadToCloudinary(file: File, signatureUrl: string): Promise<CloudinaryUploadResult> {
  const sigRes = await fetch(signatureUrl);
  if (!sigRes.ok) throw new Error("Could not get upload signature");
  const params: SignedUploadParams = await sigRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", params.signature);
  formData.append("timestamp", String(params.timestamp));
  formData.append("public_id", params.publicId);
  formData.append("api_key", params.apiKey);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${params.cloudName}/auto/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? "Upload failed"); }
  return res.json();
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

/* ── Props ───────────────────────────────────────────────────────────────── */
type Props = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
};

export default function AdminProfileClient({ fullName, email, avatarUrl: initAvatar, joinedAt }: Props) {
  const router = useRouter();

  /* ── Avatar ── */
  const [avatar, setAvatar]                   = useState(initAvatar);
  const [avatarUploading, setAvatarUploading] = useState(false);

  /* ── Change password (inline) ── */
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext]       = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError]     = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwPending, startPwTransition] = useTransition();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const result = await uploadToCloudinary(file, "/api/profile/upload-signature");
      await updateAvatarAction(result.secure_url);
      setAvatar(result.secure_url);
    } catch { /* silent */ }
    finally { setAvatarUploading(false); }
  }

  function handlePasswordSubmit() {
    setPwError("");
    setPwSuccess(false);
    if (pwNext !== pwConfirm) { setPwError("Passwords do not match"); return; }
    startPwTransition(async () => {
      const res = await changePasswordAction({ currentPassword: pwCurrent, newPassword: pwNext });
      if (!res.success) { setPwError(res.error); return; }
      setPwSuccess(true);
      setPwCurrent(""); setPwNext(""); setPwConfirm("");
    });
  }

  return (
    <div className={classes.page}>

      {/* ── Page heading ── */}
      <div className={classes.pageHeading}>
        <button className={classes.backBtn} onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className={classes.pageTitle}>My Profile</p>
          <p className={classes.pageSubtitle}>Manage your account information</p>
        </div>
      </div>

      {/* ══ Account Information ══ */}
      <div className={classes.card}>
        <div className={classes.cardStripe} />
        <div className={classes.cardHead}>
          <span className={classes.cardTitle}>Account Information</span>
        </div>
        <div className={classes.cardBody}>
          <div className={classes.accountGrid}>

            {/* Left: avatar + info */}
            <div className={classes.accountLeft}>
              <label
                className={`${classes.avatarWrap} ${avatarUploading ? classes.avatarUploading : ""}`}
                title="Change avatar"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={fullName} className={classes.avatarImg} />
                ) : (
                  <div className={classes.avatarInitials}>{getInitials(fullName)}</div>
                )}
                <div className={classes.avatarOverlay}>
                  <div className={classes.avatarEditIcon}>
                    <Camera size={15} />
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
              </label>

              <div className={classes.userFields}>
                <div className={classes.fieldGroup}>
                  <span className={classes.fieldLabel}>Full name</span>
                  <span className={classes.fieldValue}>{fullName}</span>
                </div>
                <div className={classes.fieldGroup}>
                  <span className={classes.fieldLabel}>Email</span>
                  <span className={classes.fieldValue}>{email}</span>
                </div>
                <div className={classes.fieldGroup}>
                  <span className={classes.fieldLabel}>Role</span>
                  <span className={classes.fieldValue}>Administrator</span>
                </div>
                <div className={classes.fieldGroup}>
                  <span className={classes.fieldLabel}>Member since</span>
                  <span className={classes.fieldValue}>
                    {new Date(joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            <hr className={classes.divider} />

            {/* Right: change password */}
            <div className={classes.passwordSection}>
              <p className={classes.passwordSectionTitle}>Change Password</p>

              <div className={classes.formGroup}>
                <span className={classes.formLabel}>Current Password</span>
                <input
                  type="password"
                  className={classes.formInput}
                  value={pwCurrent}
                  onChange={e => setPwCurrent(e.target.value)}
                  placeholder="••••••••"
                  disabled={pwPending}
                />
              </div>
              <div className={classes.formGroup}>
                <span className={classes.formLabel}>New Password</span>
                <input
                  type="password"
                  className={classes.formInput}
                  value={pwNext}
                  onChange={e => setPwNext(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  disabled={pwPending}
                />
              </div>
              <div className={classes.formGroup}>
                <span className={classes.formLabel}>Confirm New Password</span>
                <input
                  type="password"
                  className={classes.formInput}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  placeholder="••••••••"
                  disabled={pwPending}
                />
              </div>

              {pwError   && <p className={classes.pwError}>{pwError}</p>}
              {pwSuccess && <p className={classes.pwSuccess}>Password changed successfully!</p>}

              <button
                className={classes.primaryBtn}
                onClick={handlePasswordSubmit}
                disabled={pwPending || !pwCurrent || !pwNext || !pwConfirm}
              >
                {pwPending ? "Updating…" : "Update Password"}
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
