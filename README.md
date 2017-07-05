You're free to use mycode with one caveat: give me a donation. I have two simple and free options for donations:

- Make your coinbase account with [my referral link](https://www.coinbase.com/join/593ec37501653a0135721e05).
    +  Once you buy or sell $100 of digital currency or more, you and I both will get $10 of free bitcoin.
- Send me $10 (or more) in BTC from your profits when you start making some money:
    + `1PbTgWny4EEqLLjE28WDkcAYvwemo7XHBP`

# Pre-requisites

## NodeJS

I'm using [v6.11.0 LTS](https://nodejs.org/en/).

## Redis

- Windows: [v3.0.504](https://github.com/MSOpenTech/redis/releases/tag/win-3.0.504)
- Else: [See Redis docs](https://redis.io/download#installation)

# Prep Work

1. Make sure you have a [Coinbase](https://coinbase.com) account; if not you can make one with [my referral link](](https://www.coinbase.com/join/593ec37501653a0135721e05) and we'll both get $10.
1. Go to [GDAX](https://gdax.com) and log in with your Coinbase account; they're the *same company*.
    - [Make an API key](https://www.gdax.com/settings/api) with `View` and `Trade` permissions.
    - Take note of the Passphrase, Key, and Key Secret that you are shown; your bot will need these for access to your account.

## Notes

Your bot will have access to all funds in your GDAX account. You can move funds back and forth between Coinbase and GDAX instantly for free. So, if you want to hide* money from the bot, keep it in Coinbase.

# Bot Configuration

![GDAX Trader](http://static.vertigion.com/images/GDAX/GDAX-Trader.png)

- Coin Details
    + **Trend Long**: Whether or not the long trend is up or down.
        * *Green (Up Arrow)*: Trend is UP.
        * *Red (Down Arrow)*: Trend is DOWN.
        * *N Trades*: Number of trades currently used to calculate trend.
            - When the application opens, the bot can pull about 400 trades quickly. the rest comes in over the live feed and will eventually build a full trend based on your settings.
    + **Trend Short**: Whether or not the short trend is up or down.
        * *Green (Up Arrow)*: Trend is UP.
        * *Red (Down Arrow)*: Trend is DOWN.
        * *N Trades*: Number of trades currently used to calculate trend.
            - When the application opens, the bot can pull about 400 trades quickly. the rest comes in over the live feed and will eventually build a full trend based on your settings.
    + **Buy**: Whether or not we're in a buy state.
        * *Green Check Mark*: We are buying LIVE; based on trend settings.
        * *Yellow Check Mark*: We would be buying, but trading is not enabled in settings.
        * *Yellow "X" Mark*: We would not be buying, and trading is not enabled in settings.
        * *Red "X" Mark*: We are not buying LIVE; based on trend settings.
    + **Trade Size**: Size of the last trade seen in the market.
    + **Price (USD)**: Price of the last trade, in U.S. Dollars, seen in the market.
    + **Time**: Time of the last trade seen in the market.
- GDAX Stream
    + This shows how much data has been seen over the web socket.
    + Note: I've seen where the web socket doesn't connect properly when you open the bot. In which case you will see 0 here. If you see 0 for more than 10 seconds, it's usually better to just kill the bot and re-open it.
- OS Information
    + This just shows CPU and Free Memory ... cause I can.

## Account Settings

Click *Account Settings*, in the top right, to acceses your account settings. Click it again to hide your account settings. **There is no *Apply* or *OK* button. All changes are detected and applied immediately.**

:bangbang: **Important**: Sandbox settings are currently not working, so just ignore them for now.

Enter your GDAX API Key, Secret, and Passphrase so that the bot will have access to your API. If you don't have these, see the [*Prep Work* section](#prep-work); above.

:bangbang: **WARNING**: All of these settings are stored in plain text in your App Data directory (windows). *I'll work on encrypting these at some point in the future.*

## Coin Settings

Click *Settings*, under the Coin-USD title, to acceses the coin specific settings. Click it again to hide coin specific settings. **There is no *Apply* or *OK* button. All changes are detected and applied immediately.**

- **Trade Enabled**: enables/disables LIVE trading for the coin.
    + If disabled, the buy indicator will show up as yellow; instead of green or red.
- **Buy on Trend L Up**: Only buy when *Trend Long* is up (green).
    + Not checking this will cause buying on either up or down (red).
- **Buy on Trend S Up**: Only buy when *Trend Short* is up (green).
    + Not checking this will cause buying on either up or down (red).
- **Trend Long (#)**: The number of trades to include in *Trend Long*.
    + The more trades you use the *safer* the estimate the trading will be.
- **Trend Short (#)**: The number of trades to include in *Trend Short*.
    + The more trades you use the *safer* the estimate the trading will be.
- **Buy Amount ($)**: Amount of USD ($) to buy when placing a buy offer.
    + *IMPORTANT*: The minimum trade amount is 0.01 coin (aka: BTC, ETH, or LTC). If your Amount (in this field) is less than 0.01 coin, your buy will automatically move up to the minimum trade amount. Here's the minimum trade amount for the values in the picture:
        * BTC: $2573.75; Minimum Trade: $25.73
        * ETH: $256.67; Minimum Trade: $2.56
        * LTC: $51.01; Minimum Trade: $0.51
- **Buy Trigger ($)**: Interval of movement to check again if we should buy. Here's an explanation based on the picture (`0.10`).
    + If the *Price (USD)* goes up or down $0.10, the bot will decide again if it wants to buy.
- **Sell Amount ($)**: Sell for this amount above the buy amount.
- **Cancel Buy (`min`, `hour`, `day`)**: Expire the stale buy order after a *minute*, an *hour*, or a *day*; respectively.
    + `0` is also a valid option and means: *Never Expire*
- **Spread (#)**: How many buy orders to place. See *Spread ($)* for examples.
- **Spread ($)**: At what interval below the current price to place the buy orders.
    + Here's the example from the picture:
        * Place *one* buy order at $0.50 below the *Price (USD)*: $2573.25
        * Of course trading isn't enables, so no buy orders would placed.
    + If we set the *Spread (#)* to `3`, and enable trading:
        * Place *three* buy orders; the first will be at $0.50 below the *Price (USD)*, and the next two will each be $0.50 below the previous"
        * First Buy Order: $2573.25
        * Second Buy Order: $2572.75
        * Third Buy Order: $2572.25