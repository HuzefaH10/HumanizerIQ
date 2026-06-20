import { runHumanizer } from './src/humanizer.js';

const text = "In today's rapidly evolving landscape, it is crucial to understand the multifaceted nature of artificial intelligence. Furthermore, it is worth noting that the implementation of robust machine learning models can significantly leverage organizational paradigms. Moreover, meticulous attention to nuanced data patterns is paramount for achieving comprehensive results. Additionally, one must endeavor to foster a holistic approach that underscores the pivotal role of innovative methodologies in transforming business ecosystems.";

const result = runHumanizer(text, "Professional", "Medium");
console.log("RESULT:");
console.log(result);
