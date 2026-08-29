---
date: "2026-08-28T14:30:00+08:00"
title: "ESP32-S3-RLCD-4.2 从零点亮：环境搭建与第一个例程"
tags: ["ESP32", "Arduino", "嵌入式", "LVGL", "微雪"]
---

前阵子买了块微雪 ESP32-S3-RLCD-4.2，人生第一次正经玩 ESP32。从拆包装到屏幕亮起来，中间踩了一串坑。这篇就当给同样刚入门的自己留个记录，顺便给后来人排排雷。

# 这块板子是什么

简单说，就是一块带 4.2 寸反射式 LCD 的 ESP32-S3 开发板，核心是 ESP32-S3-WROOM-1-N16R8：

- 双核 Xtensa LX7 @ 240MHz
- 16MB Flash + 8MB PSRAM
- 4.2 寸 400 x 300 反射式屏幕，驱动芯片 ST7305，不需要背光（室内光就能看清，很像电子纸）
- 音频模块 ES8311 + ES7210（双麦克风）
- PCF85063 RTC、SHTC3 温湿度、TF 卡槽、USB Type-C
- 支持 18650 电池

官方文档在 [docs.waveshare.net/wiki/ESP32-S3-RLCD-4.2](https://docs.waveshare.net/wiki/ESP32-S3-RLCD-4.2)，同时提供 Arduino 和 ESP-IDF 两条路线。新手闭眼选 Arduino。

# 第一步：确认电脑认出了板子

用 USB-C 线插上电脑，打开设备管理器，能看到两个设备：

- `USB JTAG/serial debug unit`
- `USB 串行设备 (COM3)`

硬件 ID 是 `USB\VID_303A&PID_1001`，也就是 ESP32-S3 的原生 USB 串口/JTAG。好消息是这块板**不需要**装 CP210x 或 CH340 驱动，Windows 直接就能用。

# 第二步：装 Arduino 环境

官方要求 arduino-esp32 v3.3.0 以上。

1. 装 Arduino IDE 2.x
2. 打开 `文件 -> 首选项 -> 附加开发板管理器网址`，把国内镜像源加进去：

```
https://jihulab.com/esp-mirror/espressif/arduino-esp32/-/raw/gh-pages/package_esp32_index_cn.json
```

3. 打开 `工具 -> 开发板 -> 开发板管理器`，搜 `esp32`，装 `esp32 by Espressif Systems`（3.3.10-cn / 3.3.11 都行）
4. 重启 IDE

## 网络这个坑

装核心的时候，工具链默认从 GitHub 下，国内直连经常超时。我的解决过程：

- 先试 `HTTPS_PROXY` 环境变量，Arduino CLI 根本不认，还是直连 GitHub
- 后来给 Clash 开了 **TUN 模式**，全局代理一发入魂，下载秒好

不想开 TUN 的话，用上面的国内镜像也能装核心，但部分工具链还是会绕到 GitHub，只能靠耐心重试。

# 第三步：下载官方示例包

在[相关资料页](https://docs.waveshare.net/wiki/ESP32-S3-RLCD-4.2/Resources-And-Documents)下载：

```
https://files.waveshare.net/wiki/ESP32-S3-RLCD-4.2/ESP32-S3-RLCD-4.2-Demo.zip
```

压缩包约 170MB，里面有：

- `01_Arduino`：Arduino 示例和库
- `02_ESP-IDF`：ESP-IDF 工程
- `03_XiaoZhi`：小智 AI 助手工程
- `04_Firmware`：出厂固件

Arduino 示例有 9 个：WiFi AP、WiFi STA、电池 ADC、RTC、温湿度、SD 卡、音频、LVGL V8、LVGL V9。

# 第四步：装库和示例

示例包里的 `Arduino\libraries` 已经把所有库都带好了：

- LVGL v8（`lvgl8`，当前例程用）
- LVGL v9（`lvgl9`，备用）
- SensorLib v0.3.1

把它们复制到 Arduino 库目录，示例放到了：

```
D:\Users\Administrator\Documents\Arduino\ESP32-S3-RLCD-4.2-Examples
```

有个坑：LVGL v8 和 v9 的库名都叫 `lvgl`，不能同时激活，否则编译器会自动选版本更高的 v9，把 v8 例程编译挂掉。我现在激活的是 v8，用来跑 `08_LVGL_V8_Test` 和 `07_Audio_Test`。

# 第五步：板卡参数设置（最容易迷路的地方）

这一步我当初研究了非常久。省流：**打开 Arduino IDE 顶部的「工具」菜单，一行一行对着选**。不是写进代码里的，也不是改什么配置文件，就是点菜单。

先把这两个最基本的选了：

1. `工具 -> 开发板 -> ESP32 Arduino -> ESP32S3 Dev Module`
2. `工具 -> 端口 -> COM3`（看不到端口就重新插拔一下 USB）

然后，还是同一个「工具」菜单，往下翻，把这些选项都点一遍：

| 「工具」菜单里的选项 | 选什么 |
| --- | --- |
| USB Mode | Hardware CDC and JTAG |
| USB CDC On Boot | Enabled |
| Flash Size | 16MB (128Mb) |
| PSRAM | OPI PSRAM |
| Partition Scheme | 16M Flash (3MB APP/9.9MB FATFS) |
| Upload Speed | 921600 |

解释：

- `USB Mode`：选 Hardware CDC and JTAG。这块板没有外接串口芯片，电脑能直接识别靠的就是它。
- `USB CDC On Boot`：选 Enabled。不开的话 `Serial` 打印不会出现在电脑上，后面调试直接瞎。
- `Flash Size`：选 16MB。板子实际就是 16MB，默认却是 4MB，不改成 16MB，分区表和实际容量对不上。
- `PSRAM`：选 OPI PSRAM。板载 8MB PSRAM，默认居然是 Disabled；不开的话 LVGL 例程分配显存会直接断言失败。
- `Partition Scheme`：选 16M Flash (3MB APP/9.9MB FATFS)。给程序 3MB 空间，和 16MB Flash 配套。
- `Upload Speed`：921600，默认就是这个，不用动。

最容易漏的就是 `PSRAM` 和 `Flash Size`。我当时编译过了，烧进去却黑屏，最后发现就是 PSRAM 没开。所有选项都在「工具」菜单里，找不到就慢慢翻，翻到了就点一下，就这么简单。

# 第六步：编译并烧录

我用 Arduino CLI 编译的 `08_LVGL_V8_Test`：

```
arduino-cli compile -b esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=cdc,PartitionScheme=app3M_fat9M_16MB "D:\Users\Administrator\Documents\Arduino\ESP32-S3-RLCD-4.2-Examples\08_LVGL_V8_Test"
```

编译结果：

```
Sketch uses 1225614 bytes (38%) of program storage space.
Global variables use 73648 bytes (22%) of dynamic memory.
```

然后烧录：

```
arduino-cli upload -p COM3 -b esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=cdc,PartitionScheme=app3M_fat9M_16MB "D:\Users\Administrator\Documents\Arduino\ESP32-S3-RLCD-4.2-Examples\08_LVGL_V8_Test"
```

esptool 认出 `ESP32-S3 (QFN56)`，写完自动重启，屏幕开始每 1.5 秒切换两张图片。那一刻，环境才算真正跑通。

# 省流

1. 先确认设备管理器认到串口，再开始装环境
2. 先跑官方例程，别一上来就自己写屏幕驱动
3. 网络不行就开 TUN/系统代理，比折腾环境变量省心一百倍
4. 编译报错先怀疑库版本，LVGL v8/v9 混用是经典坑
5. 屏幕驱动是 ST7305，例程接线：MOSI=12、SCL=11、DC=5、CS=40、RST=41，分辨率 400x300

# 后记

后来我用这块板做了个桌面降雨屏：连上中山大学校园网（还搞明白一个老梗：ESP32-S3 只能连 2.4G，得选 `SYSU-SECURE-2.4G`），每天显示南校未来两小时的降雨和大时钟，以后看是否停训更方便了（确信）。等有空单独写一篇。
