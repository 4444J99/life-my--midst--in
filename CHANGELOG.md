# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-02-13)


### Features

* Add API versioning infrastructure ([b5e2f86](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/b5e2f8671076e6fc2f58bbe53e1c4f740996b8cf))
* add auth middleware, Dockerfiles, CI fixes, and cleanup ([b33aeb2](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/b33aeb22e708b9c8f748b0fde44d98e136a121e4))
* Add complete API (Fastify) and Orchestrator (Node.js) applications ([dd6c234](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/dd6c234ab74b969570c1ffcd216609b7e661dac5))
* Add cryptographic integrity proof generation for artifacts ([56c40c0](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/56c40c0a041b3061e6d2c65581bfdce6d6d5bbd9))
* add design system, PDF templates, DLQ, and UI polish ([8421d61](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/8421d6169d9c438669151c7603bc4d5643a94c8c))
* Add husky + lint-staged pre-commit hooks ([ee71531](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/ee71531fe2fca5ba94b54afcaf6cba4f68e536f8))
* Add k6 load testing and Grafana dashboard infrastructure ([a3a632e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a3a632e1499abe69df7481b16ae5d4344de69074))
* Add LLM-based artifact classification prompts and handler ([fc6536c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/fc6536c5c9f768395b4904084ea0595c4d1dcec0))
* Add LocalFsIntegration for testing artifact pipeline ([a856dc9](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a856dc9c0ed8f3247f2234ec2fd0f06b787fa011))
* Add open source deployment infrastructure ([9de2d89](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/9de2d89a9d7d85b52f43ccb2bb05341202610edf))
* Add performance tooling and embeddings infrastructure ([533b582](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/533b582c7e6c8ffcbfe30de33a479850eadd66a9))
* Add persistent DID registry and pgvector semantic search ([dc5f059](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/dc5f05923539669051bb8b4dcd94f83528cc8fa6))
* Add schemas, documentation, CI/CD, and development utilities ([42b1206](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/42b12064e58b18bcad2e4393d8bf1a99c0c7c026))
* add SHA256 checksums + minimatch glob tag filtering ([0298c1b](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/0298c1ba48870d7bdc5e8671bcc431e719c61987))
* Add testing infrastructure — Playwright E2E, coverage scripts, and integration tests ([d1f3e26](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/d1f3e2619abe4905de9fa4816571f7a12a12539b))
* Add Zod env validation for API and web apps ([76596bf](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/76596bfc707504489c6c65b188a685a8a64bc774))
* **api,web,content-model:** user + admin settings panels ([09312ae](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/09312ae576ff98dbd3741915fc87f08c2ebe7a80))
* **api,web:** add interactive demo mode and share polish ([b23a438](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/b23a438744430990c13b103a352a8d8f8865ef0a))
* **api,web:** dynamic mask recommendation during interview ([bb1ea73](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/bb1ea73279fdee80358d02e8b6034d8eada3d961))
* **api,web:** identity_core persistence and COVENANT (G3, G6, G7) ([202dcee](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/202dcee5473b76ea51d75201cf0ea13d3e7c1f29))
* **api,web:** live interview scoring with WebSocket subs (G11) ([42775f4](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/42775f4bef79c2e8b0bdebabac9ec02d38ac1037))
* **api:** add @fastify/helmet security headers (G19) ([c2a5ceb](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c2a5ceb4834a2246d050ea3d69a63267a80b76be))
* **api:** add admin middleware to taxonomy + remove dev fallbacks ([a8094f9](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a8094f9a29f6130e29bcfdca5d2ef1964e048329))
* **api:** add EventEmitter-based PubSub for subscriptions ([ca40ee2](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/ca40ee231a2de6f312c1798e5dcf1d20cf22ddf2))
* **api:** add service status, settings, and feature flags ([741334b](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/741334bf8900a5c51c963c14cf62f01ab365f2b8))
* **api:** add WebSocket transport for GraphQL subscriptions ([e2d9dba](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/e2d9dbae303836481a78eb5373b7fef1ab088a87))
* **api:** dynamic interview questions and mask suggest (G9, G12) ([9b4d388](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/9b4d3886f63edaa8d1b00b0ee358b5d1eedb1d08))
* **api:** enrich seed data with comprehensive personas ([aa4cd03](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/aa4cd0397a485fb108c5c491658a6234359155f7))
* **api:** implement subscription resolvers + emit from mutations ([e68a14a](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/e68a14a24bc1d923631fb29a1ffc938d9a3f89e8))
* **api:** improve global auth hook with prefix matching ([300be3d](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/300be3d0fb0f3adae7fe25641837c8ceab98796e))
* **api:** jwt revocation blocklist via Redis (ADR-010) ([5e53493](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/5e534932671b1096c186173e72255d849b779ec5))
* **api:** migrate tests to buildTestApp + add disableAuth ([727dd79](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/727dd79910dd72ffa6ad1595ca927d3f84ab49ac))
* **api:** wire GraphQL endpoint with depth limiting ([7451481](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/7451481db68b75b145be760444876694cefb008a))
* **api:** wire GraphQL timeline + narrative resolvers ([c3f548d](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c3f548d09f92d119d37ec374ca4dfca8b5449bf2))
* **api:** wire narrative routes to real database repos ([f9a65fc](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f9a65fc3aa4e13cb2a5af012f69aa25a02eec9f0))
* **api:** wire ownership middleware to all write routes ([8fdd744](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/8fdd7441a3dbb8bd3ca0f0542bd27899a07f85e8))
* Complete all 8 production workstreams (Grade A 90/100) ([b63d9e2](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/b63d9e2489f3f27c621c58894bd5640b2afa1681))
* Complete in–midst–my–life theatrical CV system (Phases 1-9) ([f3beaf4](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f3beaf43faf589ffac82221168a87cae09f39e05))
* Complete Phase 0 - Hunter Protocol + Theatrical UI + Real Job Integration ([24f7fe8](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/24f7fe88ec00ef6323f289a067b9e9497a3d3503))
* Complete Phase 6 - CatcherAgent with Repositories + ArtifactSyncScheduler ([6bb8218](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/6bb8218ae2c1680167095c65dc1578170ddd9c55))
* **content-model,api:** contextual follow-up generation ([c986d38](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c986d38f370d4e6dfd2a65e7c0b01c6a452811dc))
* **content-model:** role-family mapping for curated masks ([43fdd33](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/43fdd33870ffdb3c6b0705a90901fca8f8f678b9))
* **core,content-model:** compensation market-rate analysis ([cc09323](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/cc093239319cd641467834b12892ce885ae18c0c))
* **core:** add did:jwk resolver ([f29abee](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f29abeedc315c084fdeb5e8c089ac3a71d75707b))
* **core:** add did:key resolver with multibase encoding ([f920bb5](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f920bb57abc3ab97a42bfa8adcff59c73e0ea59e))
* **core:** add did:pkh resolver for blockchain addresses ([1120bce](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/1120bce223ab74b24533e1943e052f5a115bf53f))
* **core:** add did:web resolver and DID API route ([c3f5396](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c3f539667239fa4693e88929915be3341bc1b1c9))
* **deps:** upgrade ESLint 9, Vitest 4, Next.js 16, tw-merge 3 ([686dfb9](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/686dfb9a9b06a181659113389a45e7521381e2c0))
* **design-system,web:** a11y critical path for wcag 2.1 AA (G18) ([8e9d638](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/8e9d638968e4da4da7be56c1c9405a27101ec9ce))
* **design-system:** add 10 new components ([441e131](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/441e131a1b0a399f670ef8af84404d8ecf0981e0))
* Extend LocalFsIntegration to support iCloud and network shares ([9ff0a1c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/9ff0a1c78d9e8d5e058fa5314c68e6377dd0c0c7))
* **hunter:** implement autonomous job search protocol (backend + frontend) ([a740249](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a7402496d89eecf2523f5a07a50ec62c54a1ab02))
* Implement artifact API endpoints with full CRUD operations ([d4b8a93](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/d4b8a9387fdadb87c873b220a44e3d24259316ba))
* Implement cloud provider factory and authentication wiring ([5717084](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/57170845781877d11fd130aa48ec5302947cb177))
* Implement DropboxIntegration for cloud artifact discovery ([993635b](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/993635b395de8aea6ab13143b20f638cb101dd02))
* Implement GoogleDriveIntegration with OAuth support ([6a55a6d](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/6a55a6d4d163a65ced9bacb358edbdd7f473a278))
* Implement webhook fulfillment and update billing roadmap ([6fca1e9](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/6fca1e97804d81583fecaa1863e9ee5c4fa2293a))
* **infra:** add deployment, monitoring, and release automation ([36b873f](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/36b873f723d385c4885536390684c7510f2ae8b5))
* **infra:** extract Helm secrets and add backup strategy ([1a1635c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/1a1635c53567d162035040abfdba94df8a3a60c0))
* **infra:** production hardening with PDB, NetworkPolicy, backups ([fe8622f](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/fe8622f859c7d8c078573199a168b67bb6131675))
* Move secrets to environment variables (comprehensive .env.example) ([07e354e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/07e354e4bcead5db76cf9ca361dfde53dcd9e390))
* **orchestrator:** implement LLM-powered agents ([3207081](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/320708148aac9b2d63f44a69051f5a195442e561))
* **orchestrator:** per-role LLM executors with tool restrictions (G15) ([c91b315](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c91b3151f23df55f56accb09ea86a3d067c62c54))
* Prepare @in-midst-my-life/schema for npm publishing ([c0fcb18](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c0fcb18164f9d2a7b28f1d2cac860dffbb6d7f61))
* Re-enable TypeScript strict mode in apps/api ([e66a70e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/e66a70e12ca9faee6feb394f9a66a6acc7387c98))
* Re-enable TypeScript strict mode in apps/web ([ea68ec3](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/ea68ec3ce5e3499a97860f3c4937b048433f37fe))
* Refactor narrative module and add integration test infrastructure ([3cd732a](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/3cd732ab0544d01a0d7d52476b06bf251c1b580c))
* Scaffold Phase 0 (Hunter Protocol + Theatrical UI) ([e168a51](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/e168a51d1ef7bba1766dc56f155038e574286e5c))
* **schema,api,web:** minimum viable marketplace (G16) ([96ba580](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/96ba580b8f146d72f2f38d7dc5cf1dfb4f4a9471))
* **schema,core,api,web:** blockchain SBT integration (G10) ([82ae464](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/82ae464cb94a7e41a1735d4cb75cdc0fde3f2f50))
* **schema:** enrich PersonalitySchema and SettingSchema (G1, G2) ([7ce514e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/7ce514ea72ca079913e03374fdfa35b26dcc1f26))
* Standardize CI/CD workflows to Node 22 + pnpm 10 ([e5c0031](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/e5c00312ffbd1d2cb3886dfede1566f43665dfb4))
* **web,core:** dynamic masks and mask matching (G4, G5, G8) ([c9bf5b2](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c9bf5b280b755443a9ce122fc427942def3d9f0d))
* **web:** add blog with MDX support ([2a5df54](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/2a5df542c20e9837d4b685b8020dd61187f95e1e))
* **web:** add bundle analyzer, web vitals, and CI size check ([9f2338c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/9f2338c578a91c731dce3211144129f465c804b4))
* **web:** add e2e navigation/admin tests and blog content ([c2134ee](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c2134eedbc74c00bdd9964decb0ca29f7e2e4c26))
* **web:** add marketing landing page ([f1732d3](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f1732d35bd42bd95cdd114ec7f4072fb7668d319))
* **web:** complete Phase 2 medium effort tasks (2.10-2.14) ([d56544e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/d56544ec97a635f9ec91e23137f77d693c6833f3))
* **web:** custom mask creation UI and admin nav (G13) ([6fb2927](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/6fb29274bb59b72f9d548fa0951659ac8aefb39b))
* **web:** redesign pricing, add public assets, admin settings ([f3a8fcd](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f3a8fcd62262875a92a99ac9927e0466b972fe5e))
* **web:** replace mock data with API calls and enhance components ([03ea675](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/03ea67537bc5819bb876d312041d6ab9a41b3bdc))


### Bug Fixes

* **A1:** Resolve schema validation and type errors in Core and Orchestrator ([a0aaa5a](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a0aaa5aa50f641bcba6a525689e8cb519cef5d6d))
* **api,content-model:** replace self-fetch, wire settings ([0ba6d9c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/0ba6d9c54a1fa7c0eeb52c679e2569c072911ae7))
* **api,core:** resolve remaining TODOs with SHA256 hash impl ([8ec31ae](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/8ec31ae7d34d47d44a930333635784d2a18db23c))
* **api:** guard mock storage and production mock data ([3141c1f](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/3141c1fb6ddcdfa4dd3ea9b7682bd5c4a6a5ffdb))
* **api:** rename duplicate 009 migration to 009b ([283e098](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/283e0981065e5a1f307f4a313007f32d41c580c5))
* Convert index signature access patterns in API routes ([793fe8e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/793fe8e26f6d4c5858fbc277cc498905df7769f6))
* **core,api:** replace ts-ignore with proper types, add WS auth ([e7cca16](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/e7cca16a0502d0dba1e3048d658c6df5b5928d23))
* **core,docs:** close issues [#37](https://github.com/organvm-iii-ergon/life-my--midst--in/issues/37), [#44](https://github.com/organvm-iii-ergon/life-my--midst--in/issues/44), [#48](https://github.com/organvm-iii-ergon/life-my--midst--in/issues/48) ([c4cd713](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/c4cd7132c8a930ff3c3138f57ca2be22e0f59812))
* **devops:** add healthchecks, fix deploy, update prod compose ([d453851](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/d453851383297f5cac796bb1eb026ae9cb0f95df))
* expand recursive-engine to canonical name ([dfba6b4](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/dfba6b496f5f98445d7b24b36df788d0d874602d))
* harden security workflow and patch vulnerabilities ([de84c9c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/de84c9c41c557b57d055a63b2a33920de7693acb))
* **infra:** fix Helm template helpers and add missing values ([64332e7](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/64332e751d10c1e44e33d3e5ec2bd5daedeb72c8))
* **infra:** wire Redis password auth into prod compose URLs ([bbbb59c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/bbbb59cd9e1749d9cf00e39b6e6fcbef4368a042))
* resolve build errors in api and core packages ([35e8a6a](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/35e8a6a912a407eb9c56e86b30e80bd001a1d5d3))
* Resolve remaining TypeScript errors in orchestrator tests ([2c6273e](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/2c6273e34df289b841aef382d6951c4713210507))
* resolve TS build errors and gitignore tsbuildinfo ([f9f0ccb](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f9f0ccbab2efa740395be7ce5f962674a535597f))
* Resolve TypeScript type errors across web and orchestrator ([2dc6a41](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/2dc6a4117f09d8979e2bc6e6865aa315f404a8ca))
* Resolve web build errors and database migration issues ([4371eb0](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/4371eb0c4c3a28a25ab4fc298e665e082cf82f14))
* Split concatenated .gitignore patterns ([b9a5fec](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/b9a5fec50748874c2bac00cb24e57e22a677093c))
* Stabilize production deployment readiness across all applications ([1c3cdfa](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/1c3cdfa05d1c08f419f1f75693ddede54caa5202))
* Standardize moduleResolution to bundler across ESM packages ([d443c1b](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/d443c1bd263451564e47f723a8bed7fdde1c5aeb))
* Upgrade design-system to React 19 peerDependency ([32b8b01](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/32b8b01fcf9fc3e78425ae7713c0efebd205f264))
* Use Node crypto for hashing and dynamic imports for ESM modules ([25d670c](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/25d670c63c5efd5828aad2c95cd59930d01ae34f))
* **web,ci:** resolve React hooks lint errors and workflow issues ([35dd034](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/35dd03448f8bc7f6bd61072c064a4cdf264b535e))
* **web,content-model,docs:** polish sprint — lint, tests, audit ([00a6e5b](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/00a6e5bfde02be8dac1932590cffbe2c2981a80c))
* **web,orchestrator:** resolve all TODOs, migrate next lint ([a3689b8](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a3689b8874c43689e3858433cf194f2f373f4a0c))
* **web:** eliminate all no-explicit-any warnings ([44e65a7](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/44e65a7fb7e5e8144594dbcd450a81f60909c471))
* **web:** make test narrative block types match PersistedNarrativeBlock ([745c9a0](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/745c9a01c4146337cb1e7544bac6db255e5842ce))
* **web:** replace UUID fallbacks with empty-state UI ([d11bdbe](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/d11bdbe295e97710cfd4d2a53bdd42e071db97f7))
* **web:** resolve final 14 ESLint warnings ([31b80c9](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/31b80c9f7563b545cfc8041742af20125a5c05fb))
* **web:** resolve floating-promise and formatting lint issues ([f9eb339](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/f9eb3398a38f96674730660bc5325502894cef33))
* Wire env validation in API and fix lint errors in index.ts ([a0ac4fd](https://github.com/organvm-iii-ergon/life-my--midst--in/commit/a0ac4fdd6d164366b6417f7e8f91cca89ae2a973))

## [Unreleased]

### Added

- Platinum Sprint: CI/CD workflow, standardized badge row, ADR documentation
- Initial CHANGELOG following Keep a Changelog format

## [0.1.0] - 2026-02-11

### Added

- Initial public release as part of the organvm eight-organ system
- Core project structure and documentation
- README with portfolio-quality documentation

[Unreleased]: https://github.com/organvm-iii-ergon/life-my--midst--in/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/organvm-iii-ergon/life-my--midst--in/releases/tag/v0.1.0
