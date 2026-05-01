import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createRequestListener } from "@mjackson/node-fetch-server";
import { createRequestHandler } from "@react-router/express";

function isRSCServerBuild(build) {
  return Boolean(
    typeof build === "object" &&
      build &&
      "default" in build &&
      typeof build.default === "object" &&
      build.default &&
      "fetch" in build.default &&
      typeof build.default.fetch === "function"
  );
}

async function run() {
  const port = Number(process.env.PORT || 3000);
  const buildPath = path.resolve(process.argv[2] || "./build/server/index.js");
  const buildModule = await import(pathToFileURL(buildPath).href);

  let build;
  const isRSCBuild = isRSCServerBuild(buildModule);

  if (isRSCBuild) {
    const config = {
      publicPath: "/",
      assetsBuildDirectory: "../client",
      ...(buildModule.unstable_reactRouterServeConfig || {}),
    };
    build = {
      fetch: buildModule.default.fetch,
      publicPath: config.publicPath,
      assetsBuildDirectory: path.resolve(
        path.dirname(buildPath),
        config.assetsBuildDirectory
      ),
    };
  } else {
    build = buildModule;
  }

  const app = express();
  app.disable("x-powered-by");

  if (!isRSCBuild) {
    app.use(compression());
  }

  app.use(
    path.posix.join(build.publicPath, "assets"),
    express.static(path.join(build.assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    })
  );

  const longCacheAssetRegex =
    /\.(?:avif|webp|png|jpe?g|gif|svg|ico|woff2?|ttf|otf|eot)$/i;
  const setLongCacheForStaticAsset = (res, filePath) => {
    if (longCacheAssetRegex.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  };

  app.use(
    build.publicPath,
    express.static(build.assetsBuildDirectory, {
      maxAge: "1h",
      setHeaders: setLongCacheForStaticAsset,
    })
  );

  app.use(
    express.static("public", {
      maxAge: "1h",
      setHeaders: setLongCacheForStaticAsset,
    })
  );

  app.use(morgan("tiny"));

  if (build.fetch) {
    app.all("*", createRequestListener(build.fetch));
  } else {
    app.all(
      "*",
      createRequestHandler({
        build: buildModule,
        mode: process.env.NODE_ENV,
      })
    );
  }

  const onListen = () => {
    const address =
      process.env.HOST ||
      Object.values(os.networkInterfaces())
        .flat()
        .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address;

    if (!address) {
      console.log(`[motogt-server] http://localhost:${port}`);
    } else {
      console.log(`[motogt-server] http://localhost:${port} (http://${address}:${port})`);
    }
  };

  const server = process.env.HOST
    ? app.listen(port, process.env.HOST, onListen)
    : app.listen(port, onListen);

  ["SIGTERM", "SIGINT"].forEach((signal) => {
    process.once(signal, () => server?.close(console.error));
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
