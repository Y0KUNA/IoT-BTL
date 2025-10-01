from graphviz import Digraph

# Tạo Activity Diagram bằng Graphviz
dot = Digraph("IoT_Activity", format="png")
dot.attr(rankdir="TB", size="8")

# Định nghĩa các node cho Activity Diagram
dot.node("start", "Start", shape="circle")
dot.node("read", "ESP8266 đọc dữ liệu cảm biến", shape="box")
dot.node("send", "Gửi dữ liệu qua WiFi", shape="box")
dot.node("store", "Lưu dữ liệu vào Database", shape="box")
dot.node("display", "Web Server hiển thị dữ liệu", shape="box")
dot.node("control", "Người dùng gửi lệnh điều khiển LED", shape="box")
dot.node("send_cmd", "Web Server gửi lệnh cho ESP8266", shape="box")
dot.node("act", "ESP8266 bật/tắt LED", shape="box")
dot.node("end", "End", shape="doublecircle")

# Kết nối các bước
dot.edge("start", "read")
dot.edge("read", "send")
dot.edge("send", "store")
dot.edge("store", "display")
dot.edge("display", "control")
dot.edge("control", "send_cmd")
dot.edge("send_cmd", "act")
dot.edge("act", "end")

# Xuất file
file_path = r"E:/Huy/IoT/BTL/iot_sequence_diagram"
dot.render(file_path, format="png", cleanup=False)
file_path + ".png"
