# Admin API gap: user management

What the SpecScape backend can and cannot do today for users, roles and account activation. Everything here comes from the two frontends and the saved HAR files. I had no backend source.

## How to read this doc

- **Citation paths:**
  - React paths are relative to this repo (`src/...`).
  - Legacy AngularJS paths start with `frontend/...`, relative to the folder that contains both repos (`C:\Users\jason\Documents`).
- **Line numbers:** they match commit `5c83908` (2026-09-30).
- **Evidence sources:**
  - **Frontend code:** what each app sends and reads.
  - **HAR captures in `C:\Users\jason\Downloads`:** `specscape.org.har`, `specscapepart2.org.har` and `localhost.har`.
    - Only `specscapepart2.org.har` contains real API traffic for any endpoint below.
    - `localhost.har` contains six `GET /api/user/principal` entries. All six bodies are an HTML page titled "HTTPS Not Available", not JSON, so they are useless as evidence.
    - `specscape.org.har` contains no `/user`, `/login` or `/logout` requests.
- **INFERRED** marks a conclusion drawn from how code uses a value, not from a captured response.
- **NOT FOUND** means I searched and found no evidence either way.
- **Personal data:** the HAR contains a real username and email. They are replaced with `<uid>` and `<mail>` here.

---

## 1. Endpoints that touch users, roles or account activation

All paths are under `/api`. The legacy API root is set at `frontend/app/lib/esapi.js:4`, and the React one at `src/api/client.ts:12`.

Legacy calls go through AngularJS `$http`, which by default resolves only on 2xx. React calls go through `request()` (`src/api/client.ts:43-114`):
- On a non-2xx status, it throws an error carrying `status` and the parsed JSON body as `data` (`src/api/client.ts:79-91`).
- On success, it returns the parsed JSON body (`src/api/client.ts:111`).

### 1.1 `GET /user/principal`: login, session check and JWT source

- **Legacy call sites:**
  - Login: `frontend/app/components/auth/auth.js:110-116`.
  - Session check at startup: `auth.js:196`, which calls `authenticate({})`.
  - JWT refresh: `auth.js:148-156`.
  - Refresh is used by the Spectrum Decoder at `frontend/app/components/streaming/streaming.js:160`.
- **React definition:** `src/api/client.ts:140`.
- **React call sites:**
  - Session check: `src/auth/AuthContext.tsx:57`.
  - Login: `src/auth/AuthContext.tsx:94`, repeated at `:130`.
  - JWT refresh: `src/auth/AuthContext.tsx:145`.
- **Request:** a GET with no body.
  - Login sends `Authorization: Basic base64(username:password)`. See `auth.js:104-108` and `src/auth/AuthContext.tsx:38-43` / `:87-90`.
  - The session check and refresh send no credentials and rely on the session cookie. See `auth.js:149-152` and `src/api/client.ts:156-161`.
- **Response:** see section 2.

### 1.2 `POST /logout`

- **Legacy:** `frontend/app/components/auth/auth.js:176`.
  - Sends the body `{}`.
  - The URL is `apiRoot + auth.logoutPath` (`logoutPath: '/logout'` at `auth.js:89`), i.e. `/api/logout`.
- **React:**
  - Defined at `src/api/client.ts:207-208`, with no body.
  - Called from `src/auth/AuthContext.tsx:137`.
- **Response:** neither app reads the body. Legacy only logs success or failure (`auth.js:177-181`), and React swallows errors (`client.ts:208`).
  - The response shape is **NOT FOUND**: there is no HAR capture.

### 1.3 `GET /user/profile`: the current user's own profile

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:235-237`.
  - Called from `frontend/app/components/auth/register/register.js:26`.
- **React:**
  - Defined at `src/api/client.ts:355-357`.
  - Called from `src/pages/RegisterPage.tsx:57`.
- **Request:** a GET with no parameters. It only works for the logged-in user; there is no way to name another user.
- **Response:** a JSON object. Legacy stores it as the form model with `$scope.user = resp.data` (`register.js:28`) and later posts it back unchanged as `newDetails` (`register.js:82-85`).
  - **INFERRED from the HAR:** `specscapepart2.org.har` has one `POST /api/user/updateProfile`. Its `newDetails` is that model, and it contains these keys:

    ```json
    {
      "uid": "<uid>", "surname": "…", "mail": "<mail>", "postalAddress": "…",
      "telephoneNumber": "…", "postalCode": null, "city": "…", "country": "…",
      "organization": "…", "fullName": "…", "enabled": true, "authorities": [],
      "username": "<uid>", "accountNonExpired": true, "accountNonLocked": true,
      "credentialsNonExpired": true, "admin": false,
      "editModePassword": "<redacted>"
    }
    ```

  - `editModePassword` is added by the form (`frontend/app/components/auth/register/register.html:184`). The other keys are **INFERRED** to be the `/user/profile` response as the server returned it.
  - **INFERRED:** `enabled`, `authorities`, `accountNonExpired`, `accountNonLocked` and `credentialsNonExpired` match Spring Security's `UserDetails` fields. This suggests the server serializes its user entity directly.
  - At capture time this account had `"admin": false` and `"authorities": []`.
- **React mock:** returns only `{ uid, mail, fullName }` (`src/api/mock.ts:217-219`). This is not representative.

### 1.4 `POST /user/updateProfile`: update your own profile

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:239-241`.
  - Called from `frontend/app/components/auth/register/register.js:82-85`.
- **React:**
  - Defined at `src/api/client.ts:359-367`.
  - Called from `src/pages/RegisterPage.tsx:129-132`.
- **Request (confirmed by HAR):** `{ "currentPassword": string, "newDetails": { …the whole profile object from 1.3… } }`.
- **Response (confirmed by HAR):**
  - HTTP 200 with `["Profile changed"]`, a JSON array of strings.
  - **INFERRED:** errors are also string arrays. Both apps display the messages of an error array (`register.js:105-113`, `src/pages/RegisterPage.tsx:140-149`), but no error response was captured.
- **Email-change side effect:** changing `mail` requires the user to re-activate their account via email. This is stated in the UI copy (`register.html`, the "need to re-activate your account" paragraph; `src/pages/RegisterPage.tsx`, same text). Server behaviour is **INFERRED** from that copy only.
- **Open question: NOT FOUND.** `newDetails` contains `uid`, `username`, `admin`, `enabled` and `authorities`, but I could not find out:
  - whether the server ignores those fields, or
  - whether it uses `newDetails.uid` to choose which user it updates.

  This needs the backend source. It must not be tested against production.

### 1.5 `POST /user/updatePassword`: change your own password

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:231-233`.
  - Called from `frontend/app/components/auth/register/register.js:46`.
- **React:**
  - Defined at `src/api/client.ts:387-392`.
  - Called from `src/pages/RegisterPage.tsx:89`.
- **Request (confirmed by HAR):** `{ "currentPassword", "newPassword", "newPasswordConfirmed" }`, all strings.
- **Response (confirmed by HAR):**
  - 200: `["Password changed"]`, or `["Password unchanged"]` when the new password equals the old one.
  - 400: `["Current password is invalid"]`.

### 1.6 `POST /user/register`: self-registration

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:227-229`.
  - Called from `frontend/app/components/auth/register/register.js:136-139`.
- **React:**
  - Defined at `src/api/client.ts:369-377`.
  - Called from `src/pages/RegisterPage.tsx:172`.
- **Request:** `{ "user": {…}, "g-recaptcha-response": string }`.
  - The legacy `user` fields come from the form models at `register.html:33, 43, 53, 63, 80, 90, 104, 114, 124, 134, 142`: `fullName`, `uid`, `mail`, `confirmMail`, `userPassword`, `confirmPassword`, `organization`, `postalAddress`, `city`, `country` and `telephoneNumber`.
  - There is no role field.
- **Response:**
  - On success, both apps ignore the body (`register.js:140-146`).
  - **INFERRED from `frontend/app/components/notifier/notifier.js`:** errors go through `onPromiseRejected`, which accepts three shapes:
    - an array of strings;
    - an array of Spring `ObjectError` objects with `defaultMessage`;
    - an object with `message`.
  - No capture exists.

### 1.7 `GET /user/activate?uid=…&secret=…`: activate an account from the emailed link

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:219-221`.
  - Called from `frontend/app/components/auth/activate/activate.js:23`.
- **React:**
  - Defined at `src/api/client.ts:379-381`.
  - Called from `src/pages/ActivatePage.tsx:20`.
- **Request:** query parameters `uid` and `secret`. The secret is the `:token` route parameter from the email link.
- **Response:**
  - On success, the body is ignored and "Account successfully activated!" is shown (`activate.js:25`).
  - On error, `resp.data` is shown directly (`activate.js:29`). **INFERRED:** a string or a string array.
  - No capture exists.

### 1.8 `GET /user/reactivate?uid=…&secret=…`: re-activate after an email change

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:223-225`.
  - Called from `frontend/app/components/auth/reactivate/reactivate.js:24`.
- **React:**
  - Defined at `src/api/client.ts:383-385`.
  - Called from `src/pages/ReactivatePage.tsx:20`.
- **Request and response:** the same as 1.7 (`reactivate.js:25-32`). No capture exists.

### 1.9 `POST /user/resendActivation`

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:243-248`.
  - Called from `frontend/app/components/auth/recover/recover.js:113`.
- **React:**
  - Defined at `src/api/client.ts:394-402`.
  - Called from `src/pages/RecoverPage.tsx:88`.
- **Request:** `{ "mail", "g-recaptcha-response" }`.
- **Response:** the body is ignored on success (`recover.js:113-116`); errors go through `onPromiseRejected`. No capture exists.

### 1.10 `POST /user/forgotPassword`

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:250-255`.
  - Called from `recover.js:57`.
- **React:**
  - Defined at `src/api/client.ts:404-412`.
  - Called from `src/pages/RecoverPage.tsx:46`.
- **Request:** `{ "mail", "g-recaptcha-response" }`.
- **Response:** the body is ignored on success (`recover.js:57-60`). No capture exists.

### 1.11 `POST /user/recover`: set a new password from the emailed link

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:257-261`.
  - Called from `recover.js:141`.
- **React:**
  - Defined at `src/api/client.ts:414-419`.
  - Called from `src/pages/RecoverPage.tsx:110`.
- **Request:** `{ "uid", "secret", "password" }`.
- **Response:** the body is ignored on success (`recover.js:141-144`). No capture exists.

### 1.12 `POST /user/forgotUsername`

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:263-268`.
  - Called from `recover.js:85`.
- **React:**
  - Defined at `src/api/client.ts:421-429`.
  - Called from `src/pages/RecoverPage.tsx:67`.
- **Request:** `{ "mail", "g-recaptcha-response" }`.
- **Response:** the body is ignored on success (`recover.js:85-88`). No capture exists.

### 1.13 `GET /user/list`: list users (legacy only, used by admins)

- **Legacy:**
  - Defined at `frontend/app/lib/esapi.js:41-43`.
  - Call sites, both behind an admin check:
    - `frontend/app/components/sensorform/sensorform.js:25`, inside `if (ctrl.isAdmin)` at `:24`.
    - `frontend/app/components/sensor-donation/application/application.js:114`, inside `if (this.isAdmin)` at `:112`.
- **React:** **not defined.** `src/api/client.ts` has no method for `/user/list`, and no React page lists users.
- **Request:** a GET with no parameters.
- **Response: INFERRED.** It is an array of user objects. The code reads only `uid` and `fullName`:
  - `sensorform.js:26-33` builds `displayName` from them and sorts by `uid`.
  - `application.html:367-368` fills the owner picker.
  - Whether the objects also include `mail`, `enabled`, `admin` or `authorities` is **NOT FOUND**, because there is no HAR capture.
  - Whether the server restricts this endpoint to admins is **NOT FOUND**. The frontend only avoids calling it for non-admins.

### Nothing else touches users or roles

Neither `frontend/app/lib/esapi.js` nor `src/api/client.ts` calls any other `/user/*` path, and neither calls any endpoint for:
- roles or authorities;
- changing another user's details;
- enabling or disabling a user;
- deleting a user.

A search for `authorities`, `ROLE_`, `role` and `roles` in both apps' own source finds only third-party libraries and HTML `role=` attributes.

---

## 2. `/api/user/principal`

### 2.1 Response shape

**Confirmed by a capture (update, 2026-10-02).** A re-saved `specscapepart2.org.har` contains two logged-in responses: HTTP 200 with exactly `{"admin": true, "username": "<uid>"}` and an `Authorization: Bearer <jwt>` response header. The request carried no `Authorization` header, so the session cookie was used. The account was an admin.

The notes below were written before that capture:

What the code establishes:

| Part | Evidence |
|---|---|
| JSON body with `username` (string, or null when not logged in) | Legacy treats a truthy `data.data.username` as logged in (`frontend/app/components/auth/auth.js:117`); React does the same (`src/auth/AuthContext.tsx:69-73`, `:117`) |
| JSON body with `admin` (boolean, INFERRED) | Legacy checks truthiness (`auth.js:121`); React types it as `admin?: boolean` (`src/api/types.ts:3`) and reads it at `src/auth/AuthContext.tsx:71` and `:132` |
| `Authorization: Bearer <jwt>` response header | Read at `auth.js:78-81` and `src/auth/AuthContext.tsx:33-36`. The JWT is stored in `localStorage["authentication_token"]` (`auth.js:81`, `AuthContext.tsx:124`) and used to authenticate to the signaling server |
| HTTP 200 even when not logged in, body `{"admin":false,"username":null}` | Only a code comment: `src/api/client.ts:136-138`. It was not re-verified for this doc |
| HTTP 401 when Basic credentials are wrong | React handles it at `src/auth/AuthContext.tsx:101-104`. It was not re-verified for this doc |

Whether the body has other fields is **NOT FOUND**. Neither app reads anything besides `username`, `admin` and the header. The React mock returns `{ username: 'demo', admin: true }` (`src/api/client.ts:143`).

The capture shows no other fields. The logged-out shape and the 401 case are still unverified.

**Contrast with `/user/list`:** it was reported that `/user/list` returns `admin: false` for every user, including known admins (see `src/api/types.ts`, `AdminUser.admin`). So `/user/principal` is the only reliable source of the admin flag found so far.

### 2.2 Every place the React app reads the admin flag

| File:line | What it does |
|---|---|
| `src/api/types.ts:3` | `Principal.admin?: boolean` |
| `src/auth/AuthContext.tsx:15` | `AuthUser.admin?: boolean` |
| `src/auth/AuthContext.tsx:21` | Declares `isAdmin: boolean` on the context |
| `src/auth/AuthContext.tsx:71` | Copies `principal.admin` into state (session check) |
| `src/auth/AuthContext.tsx:132` | Copies `principal.admin` into state (login) |
| `src/auth/AuthContext.tsx:161` | `isAdmin: Boolean(user?.admin)`, the single source for all readers below |
| `src/auth/RequireAuth.tsx:50-64` | `RequireAdmin` sends non-admins to `/sensors` (`:62-63`) |
| `src/App.tsx:157-159`, `:165-167`, `:173-175`, `:181-183` | Admin-only routes: `/spectrum-decoder-status`, `/campaign-management`, `/sensor-application-list` and `/sensor-application-statistics` |
| `src/layout/Navbar.tsx:18`, `:194` | Shows the admin menu section |
| `src/pages/SensorsPage.tsx:99`, `:213`, `:318` | Shows the non-admin sensor view (`:213`) or the admin view of all sensors (`:318`) |
| `src/pages/SpecMonPage.tsx:77`, `:251`, `:257` | Admins get looser frequency and resolution limits |
| `src/pages/StreamingStatusPage.tsx:7`, `:13`, `:31`, `:33` | Skips loading and hides the page for non-admins (duplicates `RequireAdmin`) |
| `src/api/client.ts:143` | Mock principal with `admin: true` (only when `VITE_USE_MOCK_API` is set) |

**The profile round trip does not read the flag:** `src/pages/RegisterPage.tsx:57` stores the `/user/profile` object, including its `admin` field (see 1.3), and `:129-132` posts it back unchanged.

**Legacy features the React port does not implement (not bugs in the flag reading):**
- **Sensor form owner picker:** the legacy sensor form has an admin-only "Operator → User" picker fed by `/user/list` (`frontend/app/components/sensorform/sensorform.html:110-119`). `src/pages/SensorFormPage.tsx` contains no admin check and no user list.
- **Sponsoring application admin controls:** the legacy page has admin-only fields and actions (`application.html:103`, `:109`, `:243`, `:286`, `:398-400`; `application.js:112`, `:223`, `:326`). `src/pages/SponsoringApplicationPage.tsx` contains no admin check.

All admin-flag reads are client-side display decisions. Whether the server enforces admin on each endpoint is **NOT FOUND**.

---

## 3. What the server would need for each admin operation

None of these operations exist today. The items below are requirements, not existing endpoints.

### 3.1 Change a user's email

- **What exists:** only self-service. `POST /user/updateProfile` (1.4):
  - acts on the logged-in user;
  - requires that user's `currentPassword`;
  - triggers re-activation by email (UI copy only, INFERRED).
- **What is missing on the server:**
  1. An admin-only operation that takes a **target user identifier** and a new email. No existing request names another user; the `newDetails.uid` question in 1.4 is unresolved.
  2. The operation must work without the target user's password.
  3. A decision on whether an admin change also forces re-activation (using the 1.8 flow) or marks the new address as verified.
  4. Uniqueness validation against other accounts' emails. Whether this exists for self-service changes is NOT FOUND.
  5. Server-side authorization that rejects non-admins. The frontend check is cosmetic.
  6. INFERRED as needed: an audit record of who changed what.

### 3.2 Change a user's role

- **What exists:** nothing that writes roles.
  - The only role information exposed is the boolean `admin` on `/user/principal` (2.1) and on `/user/profile` (1.3, INFERRED from HAR).
  - `/user/profile` also has an `authorities` array, empty for the captured account (INFERRED). Whether admin status comes from that array or from a separate column is NOT FOUND.
- **What is missing on the server:**
  1. A role model. Today only a boolean is visible, and three roles need a field or authority set that can represent them.
  2. An admin-only operation that sets a target user's role.
  3. `/user/principal` (and `/user/list`, if the admin page uses it) must expose the role, or the UI cannot show or gate on it.
  4. **A decision on sessions and JWTs.** The UI reads `admin` once per session check or login (`src/auth/AuthContext.tsx:57-73`, `:94-132`), and the signaling JWT may carry authorization claims.
     - Whether the JWT contains an admin claim is NOT FOUND; the frontend only passes the token along, never decodes it.
     - A role change may therefore not take effect until the affected user logs in again. The server needs a rule for this.
  5. Rules against an admin removing their own admin role, or the last admin being demoted.

### 3.3 Manually activate an account, bypassing email verification

- **What exists:** `GET /user/activate` and `GET /user/reactivate` (1.7, 1.8).
  - Both require the per-user `secret` from the emailed link, so an admin cannot use them without that secret.
  - `POST /user/resendActivation` (1.9) only sends another email.
- **What is missing on the server:**
  1. An admin-only operation that marks a target user as activated without a secret. **INFERRED:** this sets `enabled: true`, going by the `UserDetails`-style field in 1.3.
  2. Invalidation of any outstanding activation secret for that user.
  3. A way for the admin UI to see who is not activated. `/user/list` is only known to return `uid` and `fullName` (1.13); whether it includes `enabled` is NOT FOUND.

---

## 4. Impact of changing `admin: boolean` to a three-value role string

What breaks depends on how the server makes the change. There are two cases.

- **Case A: the `admin` key keeps its name and becomes a string** (for example `"user"`, `"operator"`, `"admin"`; the actual values are unknown).
  - Every check below tests truthiness, and any non-empty string is truthy, so **every logged-in user would be treated as an admin in the UI**:
    - `frontend/app/components/auth/auth.js:121`;
    - `src/auth/AuthContext.tsx:161` (`Boolean(user?.admin)`).
  - The server would still enforce its own checks (INFERRED; NOT FOUND whether it does per endpoint). But non-admins would see and call admin screens, and legacy would call `/user/list` for them (`sensorform.js:24-25`, `application.js:112-114`).
  - TypeScript would not catch this: the type at `src/api/types.ts:3` only describes the JSON, it does not validate it at runtime.
- **Case B: a new key (for example `role`) replaces `admin`.**
  - `admin` becomes `undefined`, so **nobody is an admin in the UI**, including real admins.
  - Every admin route, menu and view disappears.

Either way, every file below needs changing. Someone also has to decide which of the three roles each check should allow, because today every check is a yes/no admin test.

### React (this repo)

| File | Lines | What changes |
|---|---|---|
| `src/api/types.ts` | 3 | `Principal.admin?: boolean` becomes a role type |
| `src/auth/AuthContext.tsx` | 15, 21, 71, 132, 161 | State type, context API (`isAdmin` becomes a role, or role checks), both principal copies, the derived flag |
| `src/auth/RequireAuth.tsx` | 50-64 | `RequireAdmin` becomes a role-aware guard |
| `src/App.tsx` | 4, 157-183 | Which role each of the four admin routes requires |
| `src/layout/Navbar.tsx` | 18, 194-240 | Which menu items each role sees (admin block starts at `:194`) |
| `src/pages/SensorsPage.tsx` | 99, 213, 318 | Which role sees the full sensor table |
| `src/pages/SpecMonPage.tsx` | 77, 251, 257 | Which role gets the looser limits |
| `src/pages/StreamingStatusPage.tsx` | 7, 13, 31, 33 | Its own admin check |
| `src/api/client.ts` | 143 | Mock principal shape |
| `src/api/mock.ts` | 217-219 | Mock profile shape; add the role if the profile carries one |
| `src/pages/RegisterPage.tsx` | 57, 129-132 | Does not read the flag, but echoes the whole profile back to `updateProfile`. If the profile gains a role field, it is posted back too, and whether the server honours it is NOT FOUND (see 1.4). This should be settled before roles exist |

### Legacy AngularJS (only if it stays deployed)

| File | Lines |
|---|---|
| `frontend/app/components/auth/auth.js` | 72, 121-122 |
| `frontend/app/app.html` | 137-141 |
| `frontend/app/index.html` | 84-88 |
| `frontend/app/components/sensorform/sensorform.js` | 19, 24 |
| `frontend/app/components/sensorform/sensorform.html` | 110 |
| `frontend/app/components/sensormap/sensormap.js` | 20 |
| `frontend/app/components/sensormap/sensormap.html` | 77, 143, 213 |
| `frontend/app/components/specmon/specmon.js` | 419, 427-429 |
| `frontend/app/components/sensor-donation/application/application.js` | 17, 112, 223, 326 |
| `frontend/app/components/sensor-donation/application/application.html` | 103, 109, 243, 286, 398-400 |
| `frontend/app/components/sensor-donation/overview/overview.js` | 105 |
| `frontend/app/components/sensor-donation/overview/overview.html` | 25, 140 |
| `frontend/app/components/auth/register/register.js` | 28, 82-85 (the same profile echo as React) |

### Outside both frontends: NOT FOUND

- **Signaling server:** it authenticates with the JWT (`src/streaming/Signaling.ts:123-125`). Whether it reads an admin claim is unknown.
- **Backend:** its own admin checks, and the source of `authorities` and `admin`, are unknown.

---

## Open questions for the backend owner

1. The exact `/user/principal` and `/user/list` response bodies (2.1, 1.13).
2. Does `updateProfile` ignore `uid`, `admin`, `enabled` and `authorities` in `newDetails`, or apply them? (1.4)
3. Which endpoints enforce admin on the server? (2.2)
4. Is admin status stored as a boolean column or as Spring `authorities`? (3.2)
5. Does the signaling JWT carry an admin claim? (4)
