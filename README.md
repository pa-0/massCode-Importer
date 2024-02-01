# massCode Importer

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/pauloeli/massCode-Importer)](https://github.com/pauloeli/massCode-Importer/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/pauloeli/massCode-Importer)](https://github.com/pauloeli/massCode-Importer/pulls)

massCode-Importer is a command-line tool designed to simplify the process of importing code snippets from your GitHub
Gists into [massCode](https://masscode.io/), a lightweight and cross-platform code snippet manager.

This tool converts your Gists into massCode-compatible snippets and tags for easy organization and access.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- Import code snippets from GitHub Gists into massCode.
- Automatically create tags based on the hashtags in your Gist descriptions.
- Convert Gist files into massCode snippet content.
- Organize and manage your code snippets efficiently in massCode.

## Getting Started

### Prerequisites

Before you begin, make sure you have the following prerequisites installed on your system:

- [Node.js](https://nodejs.org/) (>= 14.0.0)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) package manager

### Installation

1. Clone the repository:

```shell
git clone https://github.com/pauloeli/massCode-Importer.git
```

2. Change to the project's directory:

```shell
cd massCode-Importer
```

3. Install the required dependencies using npm or yarn:

```shell
npm install
# or
yarn install
```

## Usage

To use `massCode-Importer`, follow these steps:

1. Make sure you have set up your GitHub Gists with the necessary code snippets and descriptions.

2. Create a `.env` file in the project directory and add your GitHub token:

```shell
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=your_github_username_here
```

Replace `your_github_token_here` with your GitHub personal access token and `your_github_username_here` with your
GitHub username.

3. Run the importer:

```shell
node --require ts-node/register src/app.ts
```

The importer will fetch your GitHub Gists, convert them into massCode-compatible format, and create JSON files for
tags and snippets.

4. Once the process is complete, you'll find two JSON files generated in the project directory: `tags.json`
   and `snippets.json`.

5. Open massCode and import these JSON files to organize and manage your code snippets.

## Contributing

Contributions are welcome! If you have any suggestions, find a bug, or want to add a feature, please open an issue or
submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
