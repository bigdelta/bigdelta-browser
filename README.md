# bigdelta-browser

Bigdelta SDK for the browser.

## Installation

To get started with using Bigdelta Browser SDK, install the package to your project via npm, yarn or script loader.

### Installing via package manager

This SDK is available as a package on npm registry named `@bigdelta-com/bigdelta-browser`. You can install the package using npm or yarn CLI.

#### Using npm CLI

```sh
npm install @bigdelta-com/bigdelta-browser
```

#### Using yarn CLI

```sh
# yarn
yarn add @bigdelta-com/bigdelta-browser
```

Import the package into your project and initialize it with your SDK key.

```ts
import { Bigdelta } from '@bigdelta-com/bigdelta-browser';

const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'any' }, forms: { enabled: true }} });
```

### Installing via script tag

This SDK is also available through CDN.

```html

<script type="application/javascript"
        src="https://cdn.jsdelivr.net/npm/@bigdelta-com/bigdelta-browser/dist/index.iife.min.js"></script>
<script type="text/javascript">
    const client = new Bigdelta({
        sdkKey: '<SDK_KEY>',
        defaultTrackingConfig: {pageViews: {enabled: true, singlePageAppTracking: 'any'}, forms: {enabled: true}}
    });
</script>
```

## Track behavior
### Send event
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

### Track form submissions

Form submissions can be automatically tracked by enabling the `defaultTrackingConfig.forms` during client creation (disabled by default), as shown below:
```html
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { forms: { enabled: true }}});
```

No additional code is needed to capture form submissions. Bigdelta takes care of it automatically. This applies to both single-page applications and traditional websites.

The form data is included as properties in the tracked event.

By default, all forms and their input fields are tracked, except those with the `type="password"`. You can customize this behavior using the `defaultTrackingConfig.forms.excludedFormIds` and `defaultTrackingConfig.forms.excludedInputFieldNames` options, as shown below:

```html
// Track all forms except the one with the ID 'my-sensitive-form'.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { forms: { enabled: true, excludedFormIds: ['my-sensitive-form'] }}});

// Track all input fields except the one with the name 'my-sensitive-field'. 
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { forms: { enabled: true, excludedInputFieldNames: ['my-sensitive-field'] }}});
```

#### Important Notes
- **Data Sensitivity**: Be careful not to collect sensitive user information without consent.

### Track page views
#### Manually
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
#### Automatically
Page View events can be tracked automatically on every page load by enabling the `defaultTrackingConfig.pageViews` during client creation (disabled by default), as shown below:
```html
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true }}});
```

Dynamic page views in single-page applications are tracked on any URL changes by default. You can control this behavior with the `defaultTrackingConfig.pageViews.singlePageAppTracking` option, as shown below:

```html
// Track any URL changes.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'any' }}});

// Track when the path or query string changes, ignoring changes in the hash.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'path-with-query' }}});
    
// Only track when the path changes, disregarding changes in the query string or hash.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'path' }}});

// Disable dynamic page views tracking in single-page applications.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'disabled' }}});
```

### Attribute marketing data
The library will automatically populate Page View events with any UTM parameters (`utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content`) or advertising click IDs (`dclid`, `fbclid`, `gbraid`, `gclid`, `ko_click_id`, `li_fat_id`, `msclkid`, `rtd_cid`, `ttclid`, `twclid`, `wbraid`) that are present on the page. 

This default behavior can be turned off by disabling the `defaultTrackingConfig.marketingAttribution` option during client creation, as shown below:
```html
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { pageViews: { enabled: true }, marketingAttribution: false }});
```

### Ensure idempotence

By default, all events, even if identical, are treated as unique and recorded in the system each time they are sent. However, you can specify a special property, `$deduplication_id` (of type `string`), to assign a unique identifier to an event. It allows deduplication of events that are accidentally sent multiple times. All subsequent events with the same `$deduplication_id` will be ignored and not recorded in the system.

```html
client.track({ event_name: 'My Custom Unique Event', properties: { my_property: 'property_value', $deduplication_id: 'unique_id' }});
```

### Track sessions

A session is a series of events that capture a single use of your product or a visit to your website. Analyzing sessions allows you to understand user behavior, including entry and exit points, duration of visits, activity, bounce rates, and more.

Bigdelta automatically computes sessions based on the events you send. This means you don't need to implement any special tracking. Our SDK adds a session identifier to each event and manage sessions automatically.

Events from the same user, browser, and device share the same session until there is no activity for more than 30 minutes, after which subsequent events are grouped into a new session. A session can include multiple tabs and windows, as long as they are in the same browser and on the same device. For example, moving from one Tab to another counts as a single session, but switching from one Browser to another starts a new session. You can also create a new session manually by calling `client.reset()`.

Events with the `created_at` property manually set are not included in sessions. Additionally, you can exclude certain events (e.g., actions triggered automatically on behalf of the user) from session calculations, as shown below:

```html
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { sessions: { enabled: true, excludeEvents: ['Event Name'] }}});
```

If session tracking is not needed, it can be disabled, as shown below:

```html
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', defaultTrackingConfig: { sessions: { enabled: false } }});
```

### Manage relations
Bigdelta automatically manages relationships between anonymous and identified users during tracking. However, if your events are related to other workspace objects, you should explicitly define these relationships for each event via `relations`, as shown below:
```html
client.track({ event_name: 'My Custom Event', properties: { my_property: 'property_value' }, relations: [{ object_slug: 'invoice', record_id: '63f2164c-2000-4f6c-b377-107368566222' }] });
```

### Set related record properties
If a certain event is supposed to change related record properties, you can easily do that using the `set` and `set_once` parameters when specifying relations, as shown below:

```html
// `set` - sets the value if it was never set before, or overrides the latest value if one exists.
// `set_once` - sets the value if it was never set before or ignores it otherwise.
client.track({ event_name: 'My Custom Event', properties: { my_property: 'property_value' }, relations: [{ object_slug: 'invoice', record_id: '63f2164c-2000-4f6c-b377-107368566222', set: { 'coupon': 'PROMO10' }, set_once: { 'invoice_no': 'IN001' }}]});
```

### Exclude bot traffic

By default, well-known bots are filtered out by the Bigdelta SDK. However, there may be instances where specific bots not included in the default filter are hitting your site and affecting your data. If you notice such behavior, you can identify a common pattern in the user agent and disable tracking for these bots using the Bigdelta SDK.

Here’s how you can disable tracking for a specific bot:

```html
if (window.navigator.userAgent.toLowerCase().includes('specificbot')) {
    client.disableTracking();
}
```

In this example, if the user agent string contains 'specificbot', tracking is disabled by calling `client.disableTracking()`. This ensures that data from these specific bots does not affect your analytics.

## Identify users & companies
You can manage user identity through the `client.identify()` and `client.reset()` methods. Utilizing these methods correctly ensures that events are appropriately linked to the user, regardless of their transitions across devices and browsers.

### Identify
You can identify a user with a unique ID to monitor their activity across devices and associate them with their events. Once you have the current user's identity, you should call `identify()` as shown below, typically after they log in or sign up:

```html
client.identify({ users: '<user id>' });
```

### Get identifier
Identifiers provided via `client.identify()` are persisted and can be accessed later using `client.getIdentifier()`, as shown below:

```html
client.identify({ invoices: '<invoice id>' });
client.getIdentifier('invoices'); // returns <invoice id>
```

### Reset
When your users logout you can trigger a reset method which will help reset the user identity. We’ll disassociate all future tracked events from the currently identified user.

```html
client.reset();
```

### Set record properties
Related record properties could be set when tracking, [as described here](#set-related-record-properties). However, if you need to set properties separately from the event or manage records that are not related to the event, you can use `client.setRecordProperties()`, as shown below:

```html
client.setRecordProperties([
{
  id: 'd63506b4-cea0-4fde-9a0e-cb2edee48929',
  slug: 'users',
  properties: {
    set: {
      name: 'user',
    },
    set_once: {
      email: 'user@email.com',
    },
  },
},
{
  id: client.getIdentifier('accounts'),
  slug: 'accounts',
  properties: {
    set: {
      title: 'account',
    },
    set_once: {
      owner: 'account@email.com',
    },
  },
}]);
```

## Protect user data with Bigdelta

Bigdelta prioritizes user privacy while providing flexibility in data collection. By default, Bigdelta is configured to transmit tracking data, but you have options to control this behavior.

### Disable tracking

To prioritize user privacy, you can proactively disable tracking during initialization of the Bigdelta client. Set the `disableTrackingByDefault` property to `true`:

```javascript
const client = new Bigdelta({sdkKey: '<SDK_KEY>', disableTrackingByDefault: true});
```

### Dynamically toggle tracking

Bigdelta client allows you to dynamically manage tracking based on user preferences or specific scenarios. Use the following methods:

- `client.enableTracking()` activates the transmission of tracking data (this is the default state).
- `client.disableTracking()` deactivates the transmission of tracking data.

### Control IP address and geolocation tracking
For more precise control over user privacy, Bigdelta offers the option to specifically toggle the tracking of IP address and geolocation information. Use the `trackIpAndGeolocation` property during initialization:

```javascript
const client = new Bigdelta({
    sdkKey: '<SDK_KEY>',
    trackIpAndGeolocation: false  // Disable IP and geolocation tracking
});
```

## Choose persistent storage
By default, cookies with a localStorage fallback are used to store state in the browser. You can control this behavior with the `storageType` option, as shown below:

```html
// Use cookies explicitly.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', storageType: 'cookies'});

// Use localStorage explicitly.
const client = new Bigdelta({ sdkKey: '<SDK_KEY>', storageType: 'localStorage'});
```
