
pkg_name := trisquel
git_branch := $(shell git rev-parse --abbrev-ref HEAD)

.PHONY: test publish

install:
	npm install

eslint:
	$(shell npm bin)/eslint src

test: install eslint
	$(shell npm bin)/mocha tests

build: test
	$(shell npm bin)/rollup -f umd -n trisquel src/template.js --output dist/trisquel.js
	$(shell npm bin)/uglifyjs dist/trisquel.js -o dist/trisquel.min.js -c -m

version.patch:
	npm version patch
	git push origin $(shell git rev-parse --abbrev-ref HEAD)

npm.publish:
	npm publish | sync
	@echo $(shell npm view $(pkg_name) version)

github.release: export RELEASE_URL=$(shell curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${GITHUB_TOKEN}" \
	-d '{"tag_name": "v$(shell npm view $(pkg_name) version)", "target_commitish": "$(git_branch)", "name": "v$(shell npm view $(pkg_name) version)", "body": "", "draft": false, "prerelease": false}' \
	-w '%{url_effective}' "https://api.github.com/repos/kiltjs/$(pkg_name)/releases" )
github.release:
	@echo ${RELEASE_URL}
	@true

release: build version.patch npm.publish github.release
