# Postman QA Task: SV Students Recommend API

## Goal

Test the full API documented at https://sv-students-recommend.onrender.com/docs using Postman.

Your team must:

1. Cover every endpoint in the Swagger document.
2. Add Postman tests that validate the response JSON, not only the status code.
3. Deliver one final shared Postman collection and one shared environment.

## Important Rules

1. Do not test blindly against production data. Use temporary users, temporary recommendations, and restore changed admin settings after the test.
2. Do not hardcode IDs or tokens inside requests. Save them into variables from previous responses.
4. Every request must include at least one automated `Tests` script.
5. For every endpoint, validate both:
   - HTTP status code
   - Response JSON structure and key field types
6. At least one negative test must be added for each area.
7. Capture evidence: screenshots of Postman test results and the final collection run summary.

## Shared Setup

Base URL:

`https://sv-students-recommend.onrender.com`

Use the included files:

1. `qa/SV_Students_Recommend_API.postman_collection.json`
2. `qa/SV_Students_Recommend.postman_environment.json`

Import both into Postman.

## Team Split

### Team 1: Auth Foundation

Own these endpoints:

1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/recover`

Responsibilities:

1. Create a disposable student user.
2. Save `studentUserId`, `studentEmail`, `studentPassword`, and `accessToken` to variables.
3. Make sure the register request uses a unique email each run.
4. Add one negative test for invalid login.

JSON checks required:

1. `register` and `login` must validate `id`, `name`, `email`, `access_token`.
2. `recover` must validate the returned `message` string.

Handoff to other teams:

1. Share `accessToken` and `studentUserId`.

### Team 2: Recommendations

Own these endpoints:

1. `GET /api/recommendations`
2. `POST /api/recommendations`
3. `GET /api/recommendations/{rec_id}`
4. `PUT /api/recommendations/{rec_id}`

Responsibilities:

1. Create one recommendation using the token from Team 1.
2. Save `recommendationId`.
3. Validate list, create, get-by-id, and update flows.
4. Add one negative test for invalid category or missing auth.

JSON checks required:

1. Recommendation objects must validate:
   - `id`
   - `name`
   - `category`
   - `description`
   - `image_url`
   - `website_link`
   - `recommender_name`
   - `created_by`
   - `created_at`
   - `updated_at`
   - `comment_count`

Handoff to other teams:

1. Share `recommendationId`.

### Team 3: Comments and Profile Read APIs

Own these endpoints:

1. `GET /api/recommendations/{rec_id}/comments`
2. `POST /api/recommendations/{rec_id}/comments`
3. `GET /api/profile/me`
4. `GET /api/profile/token`

Responsibilities:

1. Use `recommendationId` from Team 2.
2. Add at least one comment with rating.
3. Validate profile and token endpoints using the student token from Team 1.
4. Add one negative test for invalid rating or missing bearer token.

JSON checks required:

1. Comment objects must validate:
   - `id`
   - `recommendation_id`
   - `commenter_name`
   - `rating`
   - `comment_text`
   - `created_at`
2. Profile response must validate:
   - `id`
   - `email`
   - `name`
   - `is_admin`
3. Token response must validate:
   - `access_token`
   - `token_type`

### Team 4: Admin APIs

Own these endpoints:

1. `POST /auth/login` as admin
2. `GET /api/admin/users`
3. `POST /api/admin/users/{user_id}/ban`
4. `POST /api/admin/users/{user_id}/unban`
5. `GET /api/admin/blacklist`
6. `POST /api/admin/blacklist`
7. `DELETE /api/admin/blacklist/{entry_id}`
8. `GET /api/admin/settings`
9. `PUT /api/admin/settings/{key}`

Responsibilities:

1. Log in with an admin account and save `adminToken`.
2. Use `studentUserId` from Team 1 for ban and unban.
3. Use a disposable email for blacklist tests.
4. Read current setting value before changing it, and restore it afterward.
5. Add one negative test for non-admin access.

JSON checks required:

1. `GET /api/admin/users` must validate array objects with:
   - `id`
   - `email`
   - `name`
   - `is_admin`
   - `is_banned`
   - `banned_until`
   - `created_at`
2. Ban and unban must validate `status`.
3. Blacklist list/add must validate `id`, `email`, and `created_at`.
4. Settings list must validate that the response is a JSON object.
5. Settings update must validate `key` and `value`.

### Team 5: Cart and Cleanup

Own these endpoints:

1. `GET /api/cart`
2. `PUT /api/cart`
3. `PUT /api/profile/password`
4. `DELETE /api/recommendations/{rec_id}`
5. `DELETE /api/profile/me`

Responsibilities:

1. Validate cart read and save using the student token.
2. Change the disposable user's password.
3. Delete the temporary recommendation created by Team 2.
4. Delete the temporary student user created by Team 1.
5. Add one negative test for unauthorized cart access.

JSON checks required:

1. Cart responses must validate `items` as an array.
2. Password change must validate `204 No Content` and empty body.
3. Recommendation delete must validate `204 No Content` and empty body.
4. Profile delete must validate `204 No Content` and empty body.

## Minimum Negative Coverage

Each team must add at least one negative case. Suggested minimum set:

1. Register with missing required field -> `422`
2. Login with wrong password -> `400`
3. Create recommendation without token -> `401` or `403`
4. Add comment with rating outside `1-5` -> `422`
5. Access admin endpoint with student token -> `403`
6. Get cart without token -> `401` or `403`

For validation errors, assert that the response contains `detail` and that it is an array or message, depending on the endpoint behavior.

## Deliverables

Submit all of the following:

1. One Postman collection that includes all API requests.
2. One Postman environment with reusable variables.
3. Passing Postman test scripts for every request.
4. One Collection Runner or Newman execution report.
5. A short bug report list with:
   - endpoint
   - request data
   - actual result
   - expected result
   - severity

## Acceptance Criteria

The task is complete only if:

1. Every endpoint from Swagger is covered.
2. Every request has automated JSON validation.
3. Variables are used for tokens, IDs, and test data.
4. The 5 teams can run their parts in sequence without manual rewriting.
5. Temporary test data is cleaned up at the end.
6. Admin changes are restored after the test.

## Suggested Execution Order

1. Team 1
2. Team 2
3. Team 3
4. Team 4
5. Team 5
6. Full collection run

## Review Checklist

Before submission, verify:

1. No request depends on a hardcoded ID.
2. All tokens are stored in variables.
3. Every response test checks JSON fields and field types.
4. Cleanup requests run successfully.
5. The final collection can be shared and re-run by another team member.