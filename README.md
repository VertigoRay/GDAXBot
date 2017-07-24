You're free to use mycode with one caveat: give me a donation. I have two simple and free options for donations:

- Make your coinbase account with [my referral link](https://www.coinbase.com/join/593ec37501653a0135721e05).
    +  Once you buy or sell $100 of digital currency or more, you and I both will get $10 of free bitcoin.
- Send me $10 (or more) in BTC from your profits when you start making some money:
    + `1PbTgWny4EEqLLjE28WDkcAYvwemo7XHBP`

# Pre-requisites

## NodeJS

I'm using [v6.11.0 LTS](https://nodejs.org/en/).

# Prep Work

1. Make sure you have a [Coinbase](https://coinbase.com) account; if not you can make one with [my referral link](https://www.coinbase.com/join/593ec37501653a0135721e05) and we'll both get $10.
1. Go to [GDAX](https://gdax.com) and log in with your Coinbase account; they're the *same company*.
    - [Make an API key](https://www.gdax.com/settings/api) with `View` and `Trade` permissions.
    - Take note of the Passphrase, Key, and Key Secret that you are shown; your bot will need these for access to your account.

## Notes

Your bot will have access to all funds in your GDAX account. You can move funds back and forth between Coinbase and GDAX instantly for free. So, if you want to *hide* money from the bot, keep it in Coinbase.

# Bot Configuration

The configuration files should be located in the `config` folder.

:warning: **Do *NOT* edit the `default.yaml` file!!**

Do not edit the `default.yaml` file. This file contains the default settings. Instead, copy this file to a new file in in the same directory (`config`) and name it: `production.yaml`.

If you want to secure your production config files, [there's documentation for that](https://github.com/lorenwest/node-config/wiki/Securing-Production-Config-Files).

Any settings not in the `production.yaml` will be pulled from the `default.yaml` file automatically. So, be sure to keep the `default.yaml` file; don't delete it.

The `NODE_ENV` environment variable will have to match the name of the YAML file that you're using; for example:

- Windows: `SET NODE_ENV=production`
- Linux/OSX: `export NODE_ENV=production`

:bangbang: **Be sure to add your API credentials to your `production.yaml` file!**

**Note:** you can name `production.yaml` whatever you want; maybe you prefer your username (ie: `VertigoRay.yaml`). Just be sure to set `NODE_ENV` correspondingly.

# Starting the Bot

## Quick Start

Browse the the directory with this application. Set your `NODE_ENV` and start the application. The `NODE_ENV` variable is used to set the name of your configuration file.

### Windows

```cmd
cd GDAX
npm install
SET NODE_ENV=production
npm start
```

### Linux / OSX

```bash
cd GDAX
npm install
export NODE_ENV=production
npm start
```

Alternatively, you can set the environment for just this one execution:

```bash
NODE_ENV=production npm start
```

# Configuring the Bot

The bot *just works* with the default config. It also works fast, making purchase evaluations every second. When you're just starting out, I suggest you pull back the reigns a little bit and set the interval on your trade enabled coins to 5 seconds:

```yaml
LTC-USD:
  trade_enabled: true
  interval: 5000
```

## Initial Config

:information_source: Do not edit the `default.yaml`. Instead, make a copy of  it, or make a new file and just put in the settings that are different. For example, just put in the account section with your API key information.

In order for the bot to work, you will need to configure your API key in the account section. The `initial_investment` will eventually be used to have the bot show your profit. The account section will end up looking something like this:

```yaml
account:
  api:
    key: uVBHC6zns7kJTzFa8M7k2g3RgwTKw9dT
    secret: MwcBuzju5g46a8ABzZZtSMvycgmkcDDgb8n2jQ2JSAH9MmjwQUdMwPfsGhBqv3daaJ3xu6MKxDfgeBP3pAWqBQ==
    passphrase: Hy3AJK968ga
  initial_investment: 500.00
```

## All Config Items

:information_source: YAML is very picky about formatting. You **must** respect indentation and formatting. To validate your YAML, here's a couple of tools:

- [YAML Lint](http://www.yamllint.com): *validate your YAML*
- [JSON to YAML](https://www.json2yaml.com): *when to prefer one over the other*

### General

The `general` section is for bot wide configurations:

*Default:*

```yaml
general:
  product_ids:
    - BTC-USD
    - ETH-USD
    - LTC-USD
  url:
    api: 'https://api.gdax.com'
    # api: 'https://api-public.sandbox.gdax.com'
    websocket: 'wss://ws-feed.gdax.com'
    # websocket: 'wss://ws-feed-public.sandbox.gdax.com'
  terminal:
    delta: true
    theme: default
  log: off
  log_level: warning
```

#### Product IDs

The `product_ids` are a list (array) of all of the product markets on GDAX that you'll be trading in. They are also referred to in this documentation *coins* or *coin markets*.

Removing or adding a market here will require a corresponding [Coin](#coin) section to be created for it. Coin sections must be the exact same spelling and case as depicted here.

#### URL

The URL allow you to point the bot at production or [sandbox](https://en.wikipedia.org/wiki/Sandbox_(software_development)) locations.

*Default / Production:*

```yaml
  url:
    api: 'https://api.gdax.com'
    websocket: 'wss://ws-feed.gdax.com'
```

*Sandbox:*

```yaml
  url:
    api: 'https://api-public.sandbox.gdax.com'
    websocket: 'wss://ws-feed-public.sandbox.gdax.com'
```

#### Terminal

These are terminal specific configurations. The terminal is the HUD display; aka: the GUI (Graphical User Interface).

- **delta** `boolean` (default: `true`) if true and if the destination is a terminal, only the cells that have changed since the last draw will be updated: it will keep performance of terminal application high.
- **theme** `string` (default: `default`) the name of the theme to use; without the extension. Available themes are available in the themes directory. [Learn more.](#theming-the-bot)

#### Log & Log Level

On production runs, you should probably just leave logging turned off. If you're experiencing issues, start your own debugging by switching the `log` to `on` with the `log_level` set to `warning`. If you want to see all of the logs, set the `log_level` to `debug`; these logs get very large very fast.

### Account

*Default:*

```yaml
account:
  api:
    key: null
    secret: null
    passphrase: null
  initial_investment: 0.00
```

In order for the bot to work, you will need to configure your API key in the account section.

```yaml
account:
  api:
    key: uVBHC6zns7kJTzFa8M7k2g3RgwTKw9dT
    secret: MwcBuzju5g46a8ABzZZtSMvycgmkcDDgb8n2jQ2JSAH9MmjwQUdMwPfsGhBqv3daaJ3xu6MKxDfgeBP3pAWqBQ==
    passphrase: Hy3AJK968ga
```

The `initial_investment` will eventually be used to have the bot show your profit. The account section will end up looking something like this:

```yaml
account:
  initial_investment: 500.00
```

### Coin

Each *coin* or *[product id](#product-ids)* will have it's own section. Coin sections must be the exact same spelling and case as depicted in *[Product IDs](#product-ids)*.

*Default:*

```yaml
LTC-USD:
  trade_enabled: true
  interval: 1000
  buy:
    amount: 0.01
    below_midmarket: 0.005
    cancel_after: min
    only_when_trend_is_full: true
    post_only: true
    spread_n: 3
    spread_v: 0.01
  sell:
    above_buy: 0.01
    post_only: true
  strategy: StdDev
  strategies:
    StdDev:
      trades_n: 1000
```

#### Trade Enabled

Enable Trading ...

#### Interval

Number of milliseconds between trade evaluations. The default basically says that the bot will/may buy once every second (1000 milliseconds).

#### Buy

- **amount** `float` (default: `0.01`; minimum: `0.01`) this is the amount of coin to buy when placing a buy order. So, if the current coin price is `$50.00` then the minimum trade amount is `$0.50`.
- **below_midmarket** `float` (default: `0.005`) this is the price below the midmarket price to place a buy order. Prices must be at whole cents though, so this will round down to two decimals; if needed.
- **cancel_after** `string` (default: `min`; other options: `hour`, `day`, `off`) if set to `min`, `hour` or `day`, will cancel the buy order automatically after that amount of time; this setting is sent to the API and GDAX handles cancellations. Setting this setting to `off` will disable order expirations.
- **only_when_trend_is_full** `boolean` (default: `true`) when true, this will cause the bot to only trade once it has enough trades to fully calculate the trend; based on your strategy settings.
- **post_only** `boolean` (default: `true`) is the *post only* flag when placing a *limit* order. Setting this to true, prevents your order from being turned into a *market* order; aka: [taker transaction](https://www.gdax.com/fees).
- **spread_n** `int` (default: `3`) is the number (`n`) of buy orders to place.
- **spread_v** `float` (default: `0.01`; when placing more than one buy orders at a time, this is the interval to place them at. The `below_midmarket` setting is always the first price.

**An example of how the `below_midmarket`, `spread_n`, and `spread_v` settings work together.**

Assumptions: you're using the default settings for Litecoin (`LTC-USD`), as depicted above, and the current midmarket price is `$45.635`.

**Note:** If the highest buy order on the books is `$45.63`, and the lowest sell order on the books is `$45.64` ... the midmarket price will be `$45.635`.

The settings tell the bot the following:

- Place a total of three (per `spread_n`) buy orders.
- The first buy order will be half a cent (`$0.005` per `below_midmarket`) below the midmarket price: `$45.63`.
- The second and third buy orders will be one cent (per `spread_v`) below the previous: `$45.62` and `$45.61`.

Let's change the midmarket price to: `$45.00`.

- Place a total of three (per `spread_n`) buy orders.
- The first buy order will be half a cent (`$0.005` per `below_midmarket`) below the midmarket price: `$44.995`. Unfortunately `$44.995` is too precise so the price will be rounded down to the next whole cent: `$44.99`.
- The second and third buy orders will be one cent (per `spread_v`) below the previous: `$44.98` and `$44.97`.

#### Sell

The `sell` section contains options for ... selling ...

- **above_buy** `float` (default: `0.01`) is the amount above your buy transaction to place the sell transaction. If the market has already recovered, and the midmarket price is above this setting, the sell price will be set to `0.01` above the midmarket price.
- **post_only** `boolean` (default: `true`) is the *post only* flag when placing a *limit* order. Setting this to true, prevents your order from being turned into a *market* order; aka: [taker transaction](https://www.gdax.com/fees).

#### Strategy & Strategies

You can pick your strategy per coin and set your coin specific strategy sections in these sections.

- **strategy** `string` (default: `StdDev`) is the case-sensitive class name (not the file name) of strategy that you want to implement.

For more information, read more on that strategy.

Available Strategies:

- [StdDev](): Standard Deviation

# Theming the Bot

That's right, the bot is themable. *Don't like the colors in the default theme?* Copy the default theme, rename it, and [point your config at it](#terminal).

When you're done, upload your theme for others to use.