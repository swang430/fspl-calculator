# fspl-webapp

一个纯前端 Web App：输入发射功率、频率（单点或范围）、距离，计算自由空间路径损耗（FSPL）与接收功率。

## 功能

- 单频点：输出 FSPL(dB) 与 Pr(dBm)
- 频率范围：输出 Pr(dBm) 范围，并绘制 Pr 随频率变化曲线
- 可选参数：发射/接收天线增益（dBi）、其它损耗（dB）

## 公式

- `FSPL(dB) = 32.44 + 20·log10(d_km) + 20·log10(f_MHz)`
- `Pr(dBm) = Pt(dBm) + Gt(dBi) + Gr(dBi) − FSPL(dB) − L(dB)`

## 运行

这是静态页面，直接双击打开 `index.html` 即可。

如果你想用本地 HTTP（推荐，避免某些浏览器限制）：

```bash
cd fspl-webapp
python3 -m http.server 5173
# 然后打开 http://127.0.0.1:5173
```

## 后续可扩展

- 加入噪声功率、带宽、噪声系数 → 输出 SNR/链路裕量
- 支持距离范围、绘制 Pr(d) 曲线
- 增加 Fresnel 区、地面反射两径模型、雨衰等
