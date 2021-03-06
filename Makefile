
git_branch := $(shell git rev-parse --abbrev-ref HEAD)

.PHONY: test publish

install:
	npm install

eslint:
	$(shell npm bin)/eslint src

transpile:
	$(shell npm bin)/rollup -f umd -n trisquel src/trisquel.js --output dist/trisquel.js

test: install eslint transpile
	$(shell npm bin)/mocha tests

build: test
	$(shell npm bin)/uglifyjs dist/trisquel.js -o dist/trisquel.min.js -c -m

npm.publish:
	npm version patch
	git push origin $(git_branch) && git push --tags
	npm publish
	@echo "published ${PKG_VERSION}"

github.release: export PKG_NAME=$(shell node -e "console.log(require('./package.json').name);")
github.release: export PKG_VERSION=$(shell node -e "console.log('v'+require('./package.json').version);")
github.release: export RELEASE_URL=$(shell curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${GITHUB_TOKEN}" \
	-d '{"tag_name": "${PKG_VERSION}", "target_commitish": "$(git_branch)", "name": "${PKG_VERSION}", "body": "", "draft": false, "prerelease": false}' \
	-w '%{url_effective}' "https://api.github.com/repos/kiltjs/${PKG_NAME}/releases" )
github.release:
	@echo ${RELEASE_URL}
	@true

release: build npm.publish github.release

.DEFAULT_GOAL := build
