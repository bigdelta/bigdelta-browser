# metrical-browser

Metrical SDK for the browser.

## Installation

To get started with using Metrical Browser SDK, install the package to your project via npm, yarn or script loader.

### Installing via package manager

This SDK is available as a package on npm registry named `@metrical-io/metrical-browser`. You can install the package using npm or yarn CLI.

#### Using npm CLI

```sh
npm install @metrical-io/metrical-browser
```

#### Using yarn CLI

```sh
# yarn
yarn add @metrical-io/metrical-browser
```

Import the package into your project and initialize it with your API key.

```ts
import { Metrical } from '@metrical-io/metrical-browser';

const client = new Metrical({ writeKey: '<write key>' });
```

### Installing via script tag

This SDK is also available through CDN.

```html
<script type="application/javascript" src="https://cdn.jsdelivr.net/npm/@metrical-io/metrical-browser/dist/index.iife.min.js"></script>
<script type="text/javascript">
const client = new Metrical({ writeKey: '<write key>' });
</script>
```

## Track behavior
### Send Event
You can track an event by calling `client.track()` with the event name and its properties.

```html
client.track({ event_name: 'My Custom Event', properties: { my_property: 'property_value' }});
```

The following properties are default properties automatically included with every track event:

- Screen Height
- Screen Width
- Referrer
- Referring Domain
- Operating System
- Device Type
- Browser
- Browser Version

All events are sent via HTTPS.

### Page Views Tracking
#### Manual
You can track a page view event by calling `client.trackPageView()`. By default, 'Page View' is used as the event name, and the following properties are recorded:
- The page title.
- The page location.
- The page protocol.
- The page domain.
- The page path.
- The page query parameters.

You can always specify a custom name and add additional properties as shown below:
```html
client.trackPageView({ event_name: 'My Custom Event', properties: { my_property: 'property_value' }}));
```
#### Automatic
Page View events can be tracked automatically on every page load by enabling the `defaultTrackingConfig.pageViews` during client creation (disabled by default), as shown below:
```html
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true }}});
```

To track dynamic page views in single-page applications, set the `defaultTrackingConfig.pageViews.singlePageAppTracking` option.

```html
// Only track when the path changes, disregarding changes in the query string or hash.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'path' }}});

// Track when the path or query string changes, ignoring changes in the hash.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'path-with-query' }}});

// Track any URL changes.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'any' }}});
```

### Marketing Attribution Tracking
The library will automatically populate Page View events with any UTM parameters (`utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content`) or advertising click IDs (`dclid`, `fbclid`, `gbraid`, `gclid`, `ko_click_id`, `li_fat_id`, `msclkid`, `rtd_cid`, `ttclid`, `twclid`, `wbraid`) that are present on the page. 

This default behavior can be turned off by disabling the `defaultTrackingConfig.marketingAttribution` option during client creation, as shown below:
```html
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true }, marketingAttribution: false }});
```

## Identify users & companies
You can manage user identity through the `client.identify()` and `client.reset()` methods. Utilizing these methods correctly ensures that events are appropriately linked to the user, regardless of their transitions across devices and browsers.

### Identify
You can identify a user with a unique ID to monitor their activity across devices and associate them with their events. Once you have the current user's identity, you should call `identify()` as shown below, typically after they log in or sign up:

```html
client.identify({ user_id: '<user id>' });
```

### Reset
When your users logout you can trigger a reset method which will help reset the user identity. We’ll disassociate all future tracked events from the currently identified user.

```html
client.reset();
```

## Protecting user data with Metrical

Metrical prioritizes user privacy while providing flexibility in data collection. By default, Metrical is configured to transmit tracking data, but you have options to control this behavior.

### Disabling tracking

To prioritize user privacy, you can proactively disable tracking during initialization of the Metrical client. Set the `disableTrackingByDefault` property to `true`:

```javascript
const client = new Metrical({ writeKey: '<write key>', disableTrackingByDefault: true });
```

### Dynamically toggling tracking

Metrical client allows you to dynamically manage tracking based on user preferences or specific scenarios. Use the following methods:

- `client.enableTracking()` activates the transmission of tracking data (this is the default state).
- `client.disableTracking()` deactivates the transmission of tracking data.
