from graphviz import Digraph

# Tạo sequence diagram bằng Graphviz
dot = Digraph("IoT_Sequence", format="png")
dot.attr(rankdir="TB", size="8")

# Các thực thể
actors = ["User/Web Client", "Web Server", "Database", "ESP8266", "Sensors", "LEDs"]
for actor in actors:
    dot.node(actor, actor, shape="rect")

# Vẽ các bước luồng chính
edges = [
    ("Sensors", "ESP8266", "Gửi dữ liệu cảm biến (ánh sáng, nhiệt độ, độ ẩm)"),
    ("ESP8266", "Web Server", "HTTP/MQTT gửi dữ liệu"),
    ("Web Server", "Database", "Lưu dữ liệu cảm biến"),
    ("User/Web Client", "Web Server", "Yêu cầu hiển thị dữ liệu"),
    ("Web Server", "Database", "Truy vấn dữ liệu cảm biến"),
    ("Web Server", "User/Web Client", "Trả về dữ liệu + giao diện"),
    ("User/Web Client", "Web Server", "Gửi lệnh điều khiển LED"),
    ("Web Server", "ESP8266", "Gửi lệnh bật/tắt LED"),
    ("ESP8266", "LEDs", "Thay đổi trạng thái LED"),
    ("ESP8266", "Web Server", "Xác nhận trạng thái LED"),
    ("Web Server", "User/Web Client", "Cập nhật trạng thái LED trên web"),
]

for src, dst, label in edges:
    dot.edge(src, dst, label)

# Xuất file
file_path = r"E:/Huy/IoT/BTL/iot_sequence_diagram"
dot.render(file_path, format="png", cleanup=False)
file_path + ".png"
