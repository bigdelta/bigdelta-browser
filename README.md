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

client.identify({ user_id: '<user id>' });

await client.track({ event_name: 'Page Viewed' });
```

### Installing via script tag

This SDK is also available through CDN.

```html
<script type="application/javascript" src="https://cdn.jsdelivr.net/npm/@metrical-io/metrical-browser/dist/index.iife.min.js"></script>
<script type="text/javascript">
const client = new Metrical({ writeKey: '<write key>' });

client.identify({ user_id: '<user id>' });

client.track({ event_name: 'Page Viewed' });
</script>
```