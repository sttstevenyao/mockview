// Interview languages. The interviewer can speak any of these (ElevenLabs is multilingual),
// and you can answer in English or in the interviewer's language.
//   speech: Web Speech API locale   scribe: ElevenLabs Speech to Text language code
export const LANGS = {
  en: { label: 'English', speech: 'en-US', scribe: 'en' },
  es: { label: 'Español', speech: 'es-ES', scribe: 'es' },
  fr: { label: 'Français', speech: 'fr-FR', scribe: 'fr' },
  de: { label: 'Deutsch', speech: 'de-DE', scribe: 'de' },
  pt: { label: 'Português', speech: 'pt-BR', scribe: 'pt' },
  ru: { label: 'Русский', speech: 'ru-RU', scribe: 'ru' },
  ar: { label: 'العربية', speech: 'ar-SA', scribe: 'ar', rtl: true },
  hi: { label: 'हिन्दी', speech: 'hi-IN', scribe: 'hi' },
  zh: { label: '中文', speech: 'zh-CN', scribe: 'zh' },
  ja: { label: '日本語', speech: 'ja-JP', scribe: 'ja' },
  ko: { label: '한국어', speech: 'ko-KR', scribe: 'ko' },
  vi: { label: 'Tiếng Việt', speech: 'vi-VN', scribe: 'vi' },
}
export const LANG_IDS = Object.keys(LANGS)
export const lang = (id) => LANGS[id] || LANGS.en

// Everything the interviewer says besides the questions, per language.
// reactions: empty | short | flag | good | ok
export const LINES = {
  es: {
    intro: (n) => `Hola, ${n}. Hoy voy a ser tu entrevistador. Usa ejemplos concretos y empecemos.`,
    transitions: ['Bien, siguiente pregunta.', 'Muy bien. Sigamos.'],
    reactions: {
      empty: 'No escuché una respuesta. Pasemos a la siguiente.',
      short: 'Fue una respuesta breve. La próxima vez, dame más detalles.',
      flag: 'Cuidado con cómo lo planteas. Enfócate en lo que hiciste tú.',
      good: 'Muy buena respuesta, clara y concreta.',
      ok: 'Gracias, entendido.',
    },
    nudges: ['Perdón, ¿qué dijiste? No escuché nada.', '¿Sigues ahí? Cuando quieras, responde en voz alta.'],
    goodbye: 'Todavía no te escucho, así que paremos aquí. Revisa tu micrófono y vuelve a empezar.',
    closing: (n) => `Eso es todo, ${n}. Veamos cómo te fue.`,
    interrupt: 'Perdón por interrumpir. ¿Cuál fue el resultado?',
    fillers: ['eh', 'em', 'este', 'o sea', 'pues', 'bueno', 'como que', 'tipo', 'digamos'],
  },
  fr: {
    intro: (n) => `Bonjour ${n}. Je serai votre recruteur aujourd’hui. Donnez des exemples précis, et commençons.`,
    transitions: ['Bien, question suivante.', 'Très bien. Continuons.'],
    reactions: {
      empty: 'Je n’ai pas entendu de réponse. Passons à la suivante.',
      short: 'C’était une réponse courte. La prochaine fois, donnez plus de détails.',
      flag: 'Attention à la façon dont vous le présentez. Concentrez-vous sur ce que vous avez fait.',
      good: 'Très bonne réponse, claire et concrète.',
      ok: 'Merci, c’est noté.',
    },
    nudges: ['Pardon, vous disiez ? Je n’ai rien entendu.', 'Vous êtes toujours là ? Répondez à voix haute quand vous voulez.'],
    goodbye: 'Je ne vous entends toujours pas, arrêtons-nous ici. Vérifiez votre micro et recommencez.',
    closing: (n) => `C’est terminé, ${n}. Voyons comment ça s’est passé.`,
    interrupt: 'Pardon de vous interrompre. Quel a été le résultat ?',
    fillers: ['euh', 'bah', 'ben', 'genre', 'du coup', 'en fait', 'voilà', 'quoi', 'bref'],
  },
  de: {
    intro: (n) => `Hallo ${n}. Ich führe heute Ihr Interview. Nennen Sie konkrete Beispiele, und dann legen wir los.`,
    transitions: ['Gut, nächste Frage.', 'Sehr gut. Machen wir weiter.'],
    reactions: {
      empty: 'Ich habe keine Antwort gehört. Gehen wir zur nächsten Frage.',
      short: 'Das war eine kurze Antwort. Nennen Sie beim nächsten Mal mehr Details.',
      flag: 'Vorsicht mit der Formulierung. Konzentrieren Sie sich darauf, was Sie getan haben.',
      good: 'Sehr gute Antwort, klar und konkret.',
      ok: 'Danke, verstanden.',
    },
    nudges: ['Entschuldigung, wie bitte? Ich habe nichts gehört.', 'Sind Sie noch da? Antworten Sie laut, wenn Sie bereit sind.'],
    goodbye: 'Ich höre Sie immer noch nicht, also hören wir hier auf. Prüfen Sie Ihr Mikrofon und starten Sie neu.',
    closing: (n) => `Das war’s, ${n}. Schauen wir uns Ihr Ergebnis an.`,
    interrupt: 'Entschuldigung, dass ich unterbreche. Was war das Ergebnis?',
    fillers: ['äh', 'ähm', 'also', 'halt', 'eigentlich', 'sozusagen', 'irgendwie', 'quasi'],
  },
  pt: {
    intro: (n) => `Olá, ${n}. Hoje eu serei seu entrevistador. Use exemplos concretos e vamos começar.`,
    transitions: ['Certo, próxima pergunta.', 'Muito bem. Vamos continuar.'],
    reactions: {
      empty: 'Não ouvi uma resposta. Vamos para a próxima.',
      short: 'Foi uma resposta curta. Da próxima vez, dê mais detalhes.',
      flag: 'Cuidado com a forma como você coloca isso. Foque no que você fez.',
      good: 'Ótima resposta, clara e concreta.',
      ok: 'Obrigado, entendi.',
    },
    nudges: ['Desculpe, o que você disse? Não ouvi nada.', 'Você ainda está aí? Quando quiser, responda em voz alta.'],
    goodbye: 'Ainda não consigo te ouvir, então vamos parar aqui. Verifique seu microfone e comece de novo.',
    closing: (n) => `É isso, ${n}. Vamos ver como você foi.`,
    interrupt: 'Desculpe interromper. Qual foi o resultado?',
    fillers: ['é', 'hum', 'tipo', 'né', 'então', 'assim', 'sabe', 'tipo assim'],
  },
  ru: {
    intro: (n) => `Здравствуйте, ${n}. Сегодня я проведу ваше собеседование. Приводите конкретные примеры, и начнём.`,
    transitions: ['Хорошо, следующий вопрос.', 'Отлично. Продолжим.'],
    reactions: {
      empty: 'Я не услышал ответа. Перейдём к следующему вопросу.',
      short: 'Это был короткий ответ. В следующий раз расскажите подробнее.',
      flag: 'Осторожнее с формулировками. Сосредоточьтесь на том, что сделали вы.',
      good: 'Очень хороший ответ, чёткий и конкретный.',
      ok: 'Спасибо, понятно.',
    },
    nudges: ['Простите, что вы сказали? Я ничего не услышал.', 'Вы ещё здесь? Отвечайте вслух, когда будете готовы.'],
    goodbye: 'Я по-прежнему вас не слышу, давайте остановимся. Проверьте микрофон и начните заново.',
    closing: (n) => `На этом всё, ${n}. Посмотрим на результаты.`,
    interrupt: 'Простите, что перебиваю. Какой был результат?',
    fillers: ['э', 'эм', 'ну', 'типа', 'как бы', 'короче', 'вот', 'значит', 'это самое'],
  },
  ar: {
    intro: (n) => `مرحبًا ${n}. سأجري معك المقابلة اليوم. استخدم أمثلة محددة، ولنبدأ.`,
    transitions: ['حسنًا، السؤال التالي.', 'ممتاز. لنكمل.'],
    reactions: {
      empty: 'لم أسمع إجابة. لننتقل إلى السؤال التالي.',
      short: 'كانت إجابة قصيرة. في المرة القادمة أعطني تفاصيل أكثر.',
      flag: 'انتبه إلى طريقة صياغتك. ركّز على ما فعلته أنت.',
      good: 'إجابة ممتازة، واضحة ومحددة.',
      ok: 'شكرًا، فهمت.',
    },
    nudges: ['عذرًا، ماذا قلت؟ لم أسمع شيئًا.', 'هل ما زلت هنا؟ أجب بصوت عالٍ عندما تكون جاهزًا.'],
    goodbye: 'ما زلت لا أسمعك، لذلك سنتوقف هنا. تحقق من الميكروفون وابدأ من جديد.',
    closing: (n) => `هذا كل شيء يا ${n}. لنرَ كيف كان أداؤك.`,
    interrupt: 'عذرًا على المقاطعة. ما النتيجة؟',
    fillers: ['يعني', 'اممم', 'آه', 'طيب', 'مثلا', 'بس', 'خلاص'],
  },
  hi: {
    intro: (n) => `नमस्ते ${n}। आज मैं आपका इंटरव्यू लूँगा। ठोस उदाहरण दीजिए, और शुरू करते हैं।`,
    transitions: ['ठीक है, अगला सवाल।', 'बहुत अच्छा। आगे बढ़ते हैं।'],
    reactions: {
      empty: 'मुझे कोई जवाब सुनाई नहीं दिया। अगले सवाल पर चलते हैं।',
      short: 'जवाब छोटा था। अगली बार थोड़ा और विस्तार से बताइए।',
      flag: 'अपनी बात कहने के तरीके पर ध्यान दीजिए। इस पर ध्यान दीजिए कि आपने क्या किया।',
      good: 'बहुत अच्छा जवाब, साफ़ और ठोस।',
      ok: 'धन्यवाद, समझ गया।',
    },
    nudges: ['माफ़ कीजिए, आपने क्या कहा? मुझे कुछ सुनाई नहीं दिया।', 'क्या आप अभी भी हैं? जब तैयार हों, ज़ोर से जवाब दीजिए।'],
    goodbye: 'मुझे अब भी आपकी आवाज़ नहीं आ रही, इसलिए यहीं रुकते हैं। अपना माइक जाँचिए और फिर से शुरू कीजिए।',
    closing: (n) => `बस इतना ही, ${n}। देखते हैं आपने कैसा किया।`,
    interrupt: 'बीच में टोकने के लिए माफ़ कीजिए। नतीजा क्या रहा?',
    fillers: ['उम्म', 'मतलब', 'वो', 'जैसे', 'तो', 'यानी', 'अच्छा', 'बस'],
  },
  zh: {
    intro: (n) => `${n}，你好。今天由我来面试你。请举具体的例子，我们开始吧。`,
    transitions: ['好，下一个问题。', '很好，我们继续。'],
    reactions: {
      empty: '我没有听到回答。我们进入下一题。',
      short: '回答有点短。下次请多讲一些细节。',
      flag: '注意你的表达方式。重点说你自己做了什么。',
      good: '回答得很好，清楚又具体。',
      ok: '谢谢，明白了。',
    },
    nudges: ['不好意思，你说什么？我什么都没听到。', '你还在吗？准备好了就大声回答。'],
    goodbye: '我还是听不到你，我们先到这里。请检查麦克风后重新开始。',
    closing: (n) => `今天就到这里，${n}。我们来看看你的表现。`,
    interrupt: '不好意思打断一下。结果怎么样？',
    fillers: ['嗯', '呃', '那个', '就是', '然后', '这个', '啊', '反正'],
  },
  ja: {
    intro: (n) => `${n}さん、こんにちは。本日の面接を担当します。具体的な例を挙げてください。では始めましょう。`,
    transitions: ['では、次の質問です。', 'いいですね。続けましょう。'],
    reactions: {
      empty: '回答が聞こえませんでした。次の質問に進みます。',
      short: '少し短い回答でした。次はもっと詳しく話してください。',
      flag: '言い方に気をつけましょう。自分が何をしたかに焦点を当ててください。',
      good: 'とても良い回答です。明確で具体的でした。',
      ok: 'ありがとうございます。わかりました。',
    },
    nudges: ['すみません、何とおっしゃいましたか？何も聞こえませんでした。', 'まだいらっしゃいますか？準備ができたら声に出して答えてください。'],
    goodbye: 'まだ声が聞こえないので、ここで終わりにします。マイクを確認して、もう一度始めてください。',
    closing: (n) => `以上です、${n}さん。結果を見てみましょう。`,
    interrupt: '途中ですみません。結果はどうなりましたか？',
    fillers: ['えー', 'えっと', 'あの', 'その', 'まあ', 'なんか', 'ちょっと'],
  },
  ko: {
    intro: (n) => `${n}님, 안녕하세요. 오늘 면접을 진행하겠습니다. 구체적인 예를 들어 주세요. 시작하겠습니다.`,
    transitions: ['좋습니다, 다음 질문입니다.', '좋아요. 계속하죠.'],
    reactions: {
      empty: '답변이 들리지 않았습니다. 다음 질문으로 넘어가겠습니다.',
      short: '답변이 조금 짧았습니다. 다음에는 더 자세히 말씀해 주세요.',
      flag: '표현에 주의하세요. 본인이 한 일에 집중해 주세요.',
      good: '아주 좋은 답변입니다. 명확하고 구체적이네요.',
      ok: '감사합니다, 잘 알겠습니다.',
    },
    nudges: ['죄송하지만, 뭐라고 하셨나요? 아무것도 들리지 않았어요.', '아직 계신가요? 준비되면 소리 내어 답해 주세요.'],
    goodbye: '여전히 들리지 않아서 여기서 마치겠습니다. 마이크를 확인하고 다시 시작해 주세요.',
    closing: (n) => `오늘은 여기까지입니다, ${n}님. 결과를 확인해 볼까요?`,
    interrupt: '말씀 중에 죄송합니다. 결과는 어땠나요?',
    fillers: ['음', '어', '그', '그러니까', '약간', '뭐', '이제', '저기'],
  },
  vi: {
    intro: (n) => `Chào ${n}. Hôm nay tôi sẽ phỏng vấn bạn. Hãy đưa ra ví dụ cụ thể, và chúng ta bắt đầu nhé.`,
    transitions: ['Được rồi, câu hỏi tiếp theo.', 'Rất tốt. Chúng ta tiếp tục.'],
    reactions: {
      empty: 'Tôi không nghe thấy câu trả lời. Chuyển sang câu tiếp theo nhé.',
      short: 'Câu trả lời hơi ngắn. Lần sau hãy nói chi tiết hơn.',
      flag: 'Hãy cẩn thận với cách diễn đạt. Tập trung vào những gì bạn đã làm.',
      good: 'Câu trả lời rất tốt, rõ ràng và cụ thể.',
      ok: 'Cảm ơn, tôi hiểu rồi.',
    },
    nudges: ['Xin lỗi, bạn nói gì vậy? Tôi không nghe thấy gì.', 'Bạn còn ở đó không? Khi sẵn sàng, hãy trả lời thành tiếng.'],
    goodbye: 'Tôi vẫn không nghe thấy bạn, nên chúng ta dừng ở đây. Hãy kiểm tra micro và bắt đầu lại.',
    closing: (n) => `Vậy là xong, ${n}. Cùng xem kết quả của bạn nhé.`,
    interrupt: 'Xin lỗi vì ngắt lời. Kết quả thế nào?',
    fillers: ['ờ', 'ừm', 'à', 'thì', 'kiểu', 'kiểu như', 'nói chung', 'là'],
  },
}

// Reaction kinds from reactions.js collapsed onto the five translated lines.
export function localReaction(langId, kind) {
  const r = LINES[langId]?.reactions
  if (!r) return ''
  if (kind === 'empty') return r.empty
  if (kind === 'short' || kind === 'nonAnswer') return r.short
  if (kind === 'flag') return r.flag
  if (kind === 'strong' || kind === 'number' || kind === 'clear') return r.good
  return r.ok
}
