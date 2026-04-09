# The vadholmen.se site

## Building web page locally
### Setup
On Ubuntu, I did the following once for the system to get a Ruby build system:
```bash
sudo apt install ruby-full build-essential
# install "bundler" for local user
gem install bundler --user-install
```

Then I did the following in my clone of the vadholmen repo to get all standard github plugins, such as Jekyll themes:
```bash
bundle config set --local path 'vendor/bundle'
bundle install
```

Now after every change I can do the following (from [`.github/workflow/lint.yml`](.github/workflow/lint.yml)):

```bash
bundle exec jekyll build
bundle exec htmlproofer ./_site --assume-extension --disable-external --ignore-urls "/connect\.facebook\.net/"
```
