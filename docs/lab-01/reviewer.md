Name: Moe Thauk Ko
ID: 67070503483
Github Username: MoeThaukKo3483


Issue #1
Comment: Server startup logic in index.ts looks clean.
Reply: Thanks! Keeping index.ts simple makes it easier to test later.

Comment: Verified that .env is listed in .gitignore so database connection strings won't accidentally be pushed to GitHub.
Reply: Thanks! I checked git status to make sure .env won't be pushed.


Issue #2
Comment: Health check returns HTTP 200 with correctly with { status: 'ok', service: 'TokTickIT API' } so it look fine to me
Reply: I tested it in the browser and confirmed it returns 200 correctly.

Comment: Good Supertest test case, It properly validates both the HTTP status code and the exact response body so it look clean to me
Reply: Thanks,The backend test passed completely when I ran npm test.


Issue #3
Comment: Category model definition looks good. The @unique constraint on name is properly set so it look good to me
Reply: Thanks! Updated the database and the table schema was created cleanly.

Issue #4
Comment: Bootstrap alert and list rendering look good. It handled dynamic array mapping properly so it look perfect to me
Reply: Thanks! I tested the button in the browser and confirmed the category list renders cleanly .