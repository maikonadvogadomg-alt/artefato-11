import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Segment {
  type: "text" | "code";
  content: string;
  language?: string;
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: "code",
      language: match[1] || "código",
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

function CodeBlock({
  code,
  language,
  onApplyToFile,
}: {
  code: string;
  language: string;
  onApplyToFile?: (code: string) => void;
}) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View
      style={[
        styles.codeBlock,
        { backgroundColor: "#0d1117", borderColor: colors.border },
      ]}
    >
      {/* Code block header */}
      <View style={[styles.codeHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.codeLangRow}>
          <Feather name="code" size={11} color="#00d4aa" />
          <Text style={styles.codeLang}>{language || "código"}</Text>
        </View>
        <View style={styles.codeActions}>
          {onApplyToFile && (
            <TouchableOpacity
              onPress={() => onApplyToFile(code)}
              style={[styles.codeBtn, { backgroundColor: "#00d4aa22", borderColor: "#00d4aa44" }]}
            >
              <Feather name="file-plus" size={11} color="#00d4aa" />
              <Text style={[styles.codeBtnText, { color: "#00d4aa" }]}>Aplicar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleCopy}
            style={[
              styles.codeBtn,
              {
                backgroundColor: copied ? "#10b98122" : "#ffffff12",
                borderColor: copied ? "#10b98144" : "#ffffff22",
              },
            ]}
          >
            <Feather name={copied ? "check" : "copy"} size={11} color={copied ? "#10b981" : "#aaa"} />
            <Text style={[styles.codeBtnText, { color: copied ? "#10b981" : "#aaa" }]}>
              {copied ? "Copiado!" : "Copiar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Code content */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 260 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Text
          selectable
          style={[
            styles.codeText,
            { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
          ]}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
  /** If true, shows "Aplicar ao arquivo" button on code blocks */
  showApply?: boolean;
}

export default function MessageRenderer({ content, isUser, showApply = true }: MessageRendererProps) {
  const colors = useColors();
  const { activeProject, activeFile, updateFile } = useApp();
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pendingCode, setPendingCode] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [applyMode, setApplyMode] = useState<"replace" | "append">("replace");

  const confirmApply = (fileId: string, code: string, mode: "replace" | "append") => {
    if (!activeProject) return;
    const f = activeProject.files.find(x => x.id === fileId);
    if (!f) return;
    const newContent = mode === "append" ? f.content + "\n\n" + code : code;
    updateFile(activeProject.id, fileId, newContent);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowFilePicker(false);
    setPendingCode("");
    setFileSearch("");
  };

  const handleApplyToFile = (code: string) => {
    if (!activeProject || activeProject.files.length === 0) {
      Alert.alert("Sem projeto", "Abra ou crie um projeto primeiro.");
      return;
    }
    setPendingCode(code);
    setApplyMode("replace");
    setFileSearch("");
    setShowFilePicker(true);
  };

  const filteredFiles = activeProject?.files.filter(f =>
    f.name.toLowerCase().includes(fileSearch.toLowerCase())
  ) || [];

  const segments = parseSegments(content);

  return (
    <View style={{ gap: 6 }}>

      {/* Modal: escolher arquivo para aplicar código */}
      <Modal visible={showFilePicker} animationType="slide" transparent onRequestClose={() => setShowFilePicker(false)}>
        <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: "75%", gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700", flex: 1 }}>📂 Aplicar em qual arquivo?</Text>
              <TouchableOpacity onPress={() => setShowFilePicker(false)} style={{ padding: 4 }}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Modo: substituir ou adicionar */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["replace", "append"] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setApplyMode(mode)}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: applyMode === mode ? "#00d4aa" : colors.border, backgroundColor: applyMode === mode ? "#00d4aa22" : colors.card }}
                >
                  <Feather name={mode === "replace" ? "file" : "file-plus"} size={13} color={applyMode === mode ? "#00d4aa" : colors.mutedForeground} />
                  <Text style={{ color: applyMode === mode ? "#00d4aa" : colors.mutedForeground, fontSize: 12, fontWeight: "600" }}>
                    {mode === "replace" ? "Substituir" : "Adicionar ao final"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Busca */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 }}>
              <Feather name="search" size={14} color={colors.mutedForeground} />
              <TextInput
                style={{ flex: 1, color: colors.foreground, fontSize: 13, paddingVertical: 8 }}
                value={fileSearch}
                onChangeText={setFileSearch}
                placeholder="Buscar arquivo..."
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Lista de arquivos */}
            <FlatList
              data={filteredFiles}
              keyExtractor={item => item.id}
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 20 }}>Nenhum arquivo encontrado</Text>
              }
              renderItem={({ item }) => {
                const isActive = item.id === activeFile?.id;
                return (
                  <TouchableOpacity
                    onPress={() => confirmApply(item.id, pendingCode, applyMode)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 8, marginBottom: 3, backgroundColor: isActive ? "#00d4aa14" : colors.card, borderWidth: 1, borderColor: isActive ? "#00d4aa44" : colors.border }}
                  >
                    <Feather name="file-text" size={14} color={isActive ? "#00d4aa" : colors.mutedForeground} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isActive ? "#00d4aa" : colors.foreground, fontSize: 13, fontWeight: "600" }}>{item.name}</Text>
                      {item.path && item.path !== item.name && (
                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{item.path}</Text>
                      )}
                    </View>
                    {isActive && <View style={{ backgroundColor: "#00d4aa22", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: "#00d4aa", fontSize: 10, fontWeight: "700" }}>ABERTO</Text></View>}
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return (
            <CodeBlock
              key={i}
              code={seg.content}
              language={seg.language || "código"}
              onApplyToFile={showApply && !isUser ? handleApplyToFile : undefined}
            />
          );
        }
        // Plain text segment — clean up leading/trailing blank lines
        const text = seg.content.replace(/^\n+/, "").replace(/\n+$/, "");
        if (!text) return null;
        return (
          <Text
            key={i}
            selectable
            style={[
              styles.textSegment,
              {
                color: isUser ? colors.primaryForeground : colors.foreground,
              },
            ]}
          >
            {text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    marginVertical: 2,
  },
  codeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  codeLangRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  codeLang: {
    color: "#00d4aa",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  codeActions: {
    flexDirection: "row",
    gap: 6,
  },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
  },
  codeBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  codeText: {
    color: "#e6edf3",
    fontSize: 12,
    lineHeight: 19,
    padding: 10,
  },
  textSegment: {
    fontSize: 14,
    lineHeight: 22,
  },
});
