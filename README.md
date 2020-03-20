# yrbox

工具箱

## 安装

```bash
$ npm install
$ npm install -g .
```

## 使用

### 帮助

```bash
$ box -h
```

### 媒体处理

#### (1) H265 压缩

例:

```bash
# 将 /Volumes/FYR/movies文件夹下的所有视频文件转码成h265
# 包括子文件夹中的视频文件, 如遇到重名不询问直接覆盖.
$ box media tohevc -d /Volumes/FYR/movies -r --crf 35 -y
```

注:

需要安装 ffmpeg

```bash
# macos
$ brew install ffmpeg
```

### 捷径

#### (1) 连接数据库

例:

```bash
# 模拟客户端方式
$ box routine db

# 手动挡方式
$ box routine db -m
```

注:

配置在 lib/routine/setting 目录中

#### (2) SSH

例:

```bash
# 手动挡方式
$ box routine ssh
```

注:

配置在 lib/routine/setting 目录中

#### (3) 常用命令一键连发

例:

```bash
$ box routine batch
```

### 账号管理

例:

```bash
$ npm run passwd-server
```
