# Mutex for shared resources over Slack

This [Webtask](https://webtask.io/) implements a [reentrant mutex](https://en.wikipedia.org/wiki/Reentrant_mutex) whose interface is in the form of a [Slack command](https://api.slack.com/slash-commands). For example, to claim a resource, you could enter `/mutex lock fussball`.

`npm run deploy` proxies `wt create` with some defaults. You just need give the webtask a name and set the resources that will be shared over Slack.

```bash
npm run deploy -- --name slack-mutex --secret resources=printer,projector,fussball
```

You can then take the Webtask URL to configure the command on Slack.

Once the command is installed, you can run `/mutex help` to learn more about the operations you can perform.
