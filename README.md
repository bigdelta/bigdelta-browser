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

### Track form submissions

This function automates the process of tracking form submissions and sending them to Metrical as custom events.

Form data is attached to the tracked event as properties.

#### Parameters
- **selector (string, required)**: A CSS selector that identifies the form(s) you want to track (e.g., #contact-form, .newsletter-signup).
- **eventName (string, required)**: The name for the event in Metrical when a form is submitted (e.g., "Contact Form Submission").

#### Usage

```javascript
// Track contact form submissions
client.trackEventOnFormSubmit("#contact-form", "Contact Form Submission");

// Track newsletter signups
client.trackEventOnFormSubmit(".newsletter-signup", "Newsletter Signup");
```

#### Important Notes
- **Data Sensitivity**: Be careful not to collect sensitive user information without consent.
- **Event Naming**: Use clear, consistent event names for easy analysis in Metrical.

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

Dynamic page views in single-page applications are tracked on any URL changes by default. You can control this behavior with the `defaultTrackingConfig.pageViews.singlePageAppTracking` option, as shown below:

```html
// Track any URL changes.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'any' }}});

// Track when the path or query string changes, ignoring changes in the hash.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'path-with-query' }}});
    
// Only track when the path changes, disregarding changes in the query string or hash.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'path' }}});

// Disable dynamic page views tracking in single-page applications.
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true, singlePageAppTracking: 'disabled' }}});
```

### Marketing Attribution Tracking
The library will automatically populate Page View events with any UTM parameters (`utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content`) or advertising click IDs (`dclid`, `fbclid`, `gbraid`, `gclid`, `ko_click_id`, `li_fat_id`, `msclkid`, `rtd_cid`, `ttclid`, `twclid`, `wbraid`) that are present on the page. 

This default behavior can be turned off by disabling the `defaultTrackingConfig.marketingAttribution` option during client creation, as shown below:
```html
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { pageViews: { enabled: true }, marketingAttribution: false }});
```

### Events Deduplication

By default, all events, even if identical, are treated as unique and recorded in the system each time they are sent. However, you can specify a special property, `$deduplication_id` (of type `string`), to assign a unique identifier to an event. It allows deduplication of events that are accidentally sent multiple times. All subsequent events with the same `$deduplication_id` will be ignored and not recorded in the system.

```html
client.track({ event_name: 'My Custom Unique Event', properties: { my_property: 'property_value', $deduplication_id: 'unique_id' }});
```

### Sessions

A session is a series of events that capture a single use of your product or a visit to your website. Analyzing sessions allows you to understand user behavior, including entry and exit points, duration of visits, activity, bounce rates, and more.

Metrical automatically computes sessions based on the events you send. This means you don't need to implement any special tracking. Our SDK adds a `session_id` to each event and manage sessions automatically.

Events from the same user, browser, and device share the same `session_id` until there is no activity for more than 30 minutes, after which subsequent events are grouped into a new session. A session can include multiple tabs and windows, as long as they are in the same browser and on the same device. For example, moving from one Tab to another counts as a single session, but switching from one Browser to another starts a new session. You can also create a new session manually by calling `client.reset()`.

Events with the `created_at` property manually set are not included in sessions. Additionally, you can exclude certain events (e.g., actions triggered automatically on behalf of the user) from session calculations, as shown below:

```html
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { sessions: { enabled: true, excludeEvents: ['Event Name'] }}});
```

If session tracking is not needed, it can be disabled, as shown below:

```html
const client = new Metrical({ writeKey: '<write key>', defaultTrackingConfig: { sessions: { enabled: false } }});
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

### Persistent Storage
By default, cookies with a localStorage fallback are used to store state in the browser. You can control this behavior with the `storageType` option, as shown below:

```html
// Use cookies explicitly.
const client = new Metrical({ writeKey: '<write key>', storageType: 'cookies'});

// Use localStorage explicitly.
const client = new Metrical({ writeKey: '<write key>', storageType: 'localStorage'});
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

### Controlling IP Address and Geolocation Tracking
For more precise control over user privacy, Metrical offers the option to specifically toggle the tracking of IP address and geolocation information. Use the `trackIpAndGeolocation` property during initialization:

```javascript
const client = new Metrical({ 
    writeKey: '<write key>', 
    trackIpAndGeolocation: false  // Disable IP and geolocation tracking
});
```