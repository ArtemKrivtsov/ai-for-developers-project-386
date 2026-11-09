# Changelog

## 0.1.0 (2026-11-09)


### Features

* add meeting booking to the API ([#21](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/21)) ([02947ea](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/02947ea9c4f619ac4338a0af7663bd7be07be86f))
* add meeting type and slot reading to the API ([#20](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/20)) ([8441b9f](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/8441b9f6febda0e358e05776ddf062db6e893843))
* add meeting type catalog ([#18](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/18)) ([94f4186](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/94f4186219e20e85fe3955bb887b747f40c15f6c))
* add meeting type creation to the API ([#19](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/19)) ([54df06f](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/54df06f3e1e50cdbcd4d11106586ea420636c0ae))
* add owner meeting types page ([#19](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/19)) ([777e41d](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/777e41d374249951b5177bb1374699c0f9cdcf82))
* add the meeting type page with days and slots ([#20](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/20)) ([9671a06](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/9671a0672ac64be5728e0f194046743f41797d88))
* add upcoming meetings to the API ([#23](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/23)) ([e5ace9f](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/e5ace9fcb5200f696ebae0fe68fe0277e9b07d1a))
* **backend:** scaffold Fastify app with health smoke test ([5934e4d](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/5934e4df31598f145ae9cae95c508cbe3657d2d5))
* **frontend:** add home page, catalog stub and routing ([5f837d9](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/5f837d92b305071b0074c38a2afb25c41c333ce1)), closes [#2](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/2)
* **frontend:** scaffold React app with Mantine and generated SDK ([5cf2e2d](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/5cf2e2d0951c1717b20f59cadbd3ba499f1a1e2e))
* implement meeting booking ([#17](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/17)) ([a014273](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/a014273aa2f63a72dd126c9a8908416936ff374f))
* let guests book a slot on the meeting type page ([#21](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/21)) ([e66b311](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/e66b31176322b19a2f34d4947c5d57c4d18a1539))
* send the guest back to fresh slots when the chosen time is gone ([#22](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/22)) ([c622ee2](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/c622ee2e2d499f7c3e71cb0bd9013290b3f9b311))
* ship the app as one Docker image ([#24](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/24)) ([89c6b96](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/89c6b967a6eff517e6b296f3585c0d1229131037))
* show the owner upcoming meetings ([#23](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/23)) ([90243e2](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/90243e2bb736ec8da669d9bbf128543816a362c0))
* **spec:** add TypeSpec contract with health endpoint ([7c44949](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/7c4494969f22047105b9ea2ea224251f832f7fc9))


### Bug Fixes

* answer GET /api with 404 instead of the page ([#24](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/24)) ([f79ca47](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/f79ca47627b9f84b97fb3860c3b5e17b4e6bdf01))
* highlight «Владельцу» on the owner pages only ([#23](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/23)) ([12fc0ba](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/12fc0ba7de3349d3f35b280ca8fcf99509c48acf))
* reject a request body that is missing or not JSON with a validation error ([#19](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/19), [#21](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/21)) ([6a55d19](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/6a55d19a5dca6d91c1cb4170874b1c5213cc2590))
* stop converting types of request body fields ([#19](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/19), [#21](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/issues/21)) ([43fe902](https://github.com/ArtemKrivtsov/ai-for-developers-project-386/commit/43fe902fc9323ee8c10125cd9b0ec15c2cacf17a))
