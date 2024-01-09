import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PromptDatumEntity } from './entities/prompt_datum.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProspectType } from 'src/type/prospect.type';
import { ProspectsService } from 'src/prospects/prospects.service';
import { CampaignType } from 'src/type/campaign.type';

@Injectable()
export class PromptDataService {
  constructor(
    @InjectRepository(PromptDatumEntity)
    private promptRepository: Repository<PromptDatumEntity>,
    @Inject(forwardRef(() => ProspectsService)) private prospectsService: ProspectsService,
  ) { }

  async generateInquiringPrompt(prospect: ProspectType, user_id: number) {
    var prompt = '';
    var role = 'Quiero que actúes como un prospectador profesional. ';
    var prospectObjectiveHeader = 'El prospecto con el que hablas ahora mismo es ' + this.getProspectDescription(prospect) + ' y tu objetivo es generar empatía y engagement con el prospecto. ';
    var messageRestriction = 'Sólo debes contestar al prospecto con un único mensaje y este debe ser lo más breve posible. No te despidas ni digas "Saludos" u otra muletilla al final del mensaje.';
    var service = 'El servicio que ofertas es conseguirle al cliente unas 50-60 reuniones con prospectos cualificados al mes y sólo pagará si obtiene beneficios.';
    var style = 'Tu respuesta debe ser una extensión de tu último mensaje y no debe tener información redundante. No hagas asunciones sobre el prospecto. Es OBLIGATORIO que empieces el mensaje con conectores como "Y si te digo que" o "Me darías la oportunidad de".';
    var inquiring = 'Deberás guiarte tomando estos mensajes de referencia:';
    var reference_one = "\n\n##\n\nMensaje: Y si te digo que además podemos cerrar las ventas por ti también para que tu solo te dediques a atender a tus clientes… Y sabes que es lo más potente de todo… que podemos trabajar contigo a éxito… si tú no vendes, nosotros no cobramos (win-win total)… esto te ayudaría a escalar tu negocio?";
    var reference_two = "\n\n##\n\nMensaje: Me darías la oportunidad de explicarte cómo hacemos para agregar un mínimo de 20k/mes de facturación a nuestros clientes en una videollamada corta… conversamos? (No tienes nada que perder y más de 20k / mes para crecer)\n\n##\n\n ";
    var endToken = "\n\n###\n\n";
    prompt = role + prospectObjectiveHeader + messageRestriction + service + style + inquiring + reference_one + reference_two + endToken;
    return prompt;
  }


  // $promptMode is used to swap between creative and adjusted to context options in Chat Demo
  async generateCorePrompt(prospect: ProspectType, prospectionCampaign: CampaignType = null, promptMode: string = 'speech', user_id: number) {
    var link = 'https://app.aippointing.com/schedule?p=' + prospect.id;
    var linkPlaceholder = 'CALENDAR-LINK';
    var extendedLink = 'https://app.aippointing.com/schedule/extended?p=' + prospect.id;

    var extendedLinkPlaceholder = 'EXTENDED-CALENDAR-LINK';
    var rejectedLinkPlaceholder = 'REJECTED-LINK';

    if (typeof prospectionCampaign !== undefined) {
      link = link + '&c=' + prospectionCampaign.id;
      extendedLink = extendedLink + '&c=' + prospectionCampaign.id;
    }

    var endToken = "\n\n###\n\n";

    if (promptMode == 'speech') {
      var prompt = '';
      var role = 'Quiero que actúes como un prospectador profesional. ';
      var prospectObjectiveHeader = 'El prospecto con el que hablas ahora mismo es ' + this.getProspectDescription(prospect) + ' y tu objetivo es despertar interés sobre tu servicio en el prospecto para que quiera agendar una reunión. ';
      var messageRestriction = 'Tu mensaje debe ser lo más corto posible. No uses placeholders de ningún tipo para el calendario.';
      var service = 'El servicio que ofertas es conseguirle al cliente hasta 50-60 reuniones con prospectos cualificados al mes. No inventes información adicional ni prometas nada que no puedas cumplir.';
      var style = 'Intenta sonar lo más interesante que puedas con un tono informal sin faltar al respeto. Ve al grano en tus respuestas, no seas redundante y no repitas lo que ha dicho el prospecto. Cuanta menos información des sobre tu servicio, mejor. En caso de tener que dar información, hazlo poco a poco. No hagas asunciones sobre el prospecto. No te despidas ni des saludos al final del mensaje. Puedes usar emojis, pero no abuses de ellos. Recuerda que es el prospecto el que debe elegir la fecha de la reunión usando el calendario, no te la inventes tú.';
      var opening = 'Ya has hablado antes con ' + prospect.first_name + ", puedes tomar estos mensajes como referencia para cada situación planteada, además deberás adecuar el tono de tus respuestas a su estilo de discurso en todo momento:\n";
      var references =
        "\n\n##\n\n" +
        "Situación: Si el prospecto muestra interés, toma este mensaje como referencia." +
        "Mensaje: Muy buenas " + prospect.first_name + "!" +
        "Mil gracias por tu respuesta ;-)" +
        "Será un placer que podamos conversar para demostrarte cómo puedo ayudarte a escalar tu negocio utilizando automatización e inteligencia artificial enfocado a conseguir más reuniones con Leads Cualificados.\n" +
        "¡Te va a gustar!\n" +
        "Please, coge un hueco de agenda que te venga bien por aquí:\n" +
        linkPlaceholder + "\n" +
        "Conversamos pronto ;-)\n" +
        "(No tienes nada que perder y más de 20k / mes para crecer)" +
        "\n\n##\n\n" +
        "Situacion: Si el cliente muestra atisbos de dudas o escepticismo, tomarás este mensaje como referencia:" +
        "Mensaje: Y si te dijera que no soy un humano, sino una IA conversacional? Eso te despertaría interés? :)" +
        "\n\n##\n\n" +
        "Situación: Si el prospecto pregunta si tiene que pagar o duda sobre si el pago es 100% a éxito, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE:" +
        "Mensaje: Pues hay una parte que te va a gustar mucho y es que con los clientes que elegimos trabajar... la parte de captación de reuniones con leads cualificados la hacemos a éxito (en ventas), es decir si tú no vendes, nosotros no cobramos (win-win total)..." +
        "\n\n##\n\n" +
        "Situación: Si el prospecto pregunta si eres un bot, una IA o un asistente virtual, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE:" +
        "Mensaje: Sí, quieres saber cómo lo hacemos? Agenda una reunión con nosotros ;-) " + linkPlaceholder +
        "\n\n##\n\n" +
        "Situación: Si el prospecto dice que no hay huecos disponibles o que no le encaja ningún hueco en el calendario que ya le has pasado o que no puede hasta una fecha futura o que contactemos más adelante, le mandarás esto:" +
        "Mensaje: Sin problema " + prospect.first_name + ", puedes probar con nuestro calendario extendido: " + extendedLinkPlaceholder +
        "\n\n##\n\n" +
        "Situación: Si el prospecto responde de forma negativa por primera vez, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE:" +
        "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + " ;-)" +
        "Duda rápida… no te interesa nunca… o a lo mejor en el futuro sí? ;-)" +
        "\n\n##\n\n" +
        "Situación: Si el prospecto responde de forma negativa después de tú haberle instigado un poco." +
        "Mensaje: Mil gracias " + prospect.first_name + "... avísame cuando sea un buen momento para ti y encantado de ayudarte..." +
        "De momento te dejo este mini - entrenamiento sobre cómo escalamos negocios de consultoría a 20k o más al mes utilizando inteligencia artificial y sistemas de automatización." +
        "Ver mini - entrenamiento aquí: " + rejectedLinkPlaceholder + " \n" +
        "He pensado podría ser de tu interés." +
        "Abrazo!" +
        "\n\n##\n\n";
      prompt = + role + prospectObjectiveHeader + messageRestriction + service + style + opening + references + endToken;

      return prompt;
    }
    prompt =  "Quiero que actúes como un prospectador profesional." +
      "Debes contestar en el idioma del prospecto." +
      "Trabajas en una empresa española ubicada en Madrid que se dedica a escalar negocios de consultoría mediante técnicas de automatización e inteligencia artificial en países hispanohablantes." +
      "Tu equipo se reparte en remoto por distintos países hispanohablantes." +
      "Si el prospecto se dedica a un sector distinto al de consultoría, puedes preguntarle si se dedica a alguna actividad de consultoría, formación, coaching o mentoring dentro del sector." +
      "El prospecto con el que hablas ahora mismo es " + this.getProspectDescription(prospect) + " y tu objetivo es despertar interés sobre tu servicio en el prospecto." +
      "Tu mensaje debe ser lo más corto posible." +
      "SÓLO Si el prospecto muestra interés en tu servicio deberás adjuntar este enlace en tu mensaje: {" + linkPlaceholder + "}" +
      "Es muy importante que uses el enlace sólo lo necesario, no lo estés spameando a cada pregunta del prospecto." +
      "El servicio que ofertas es conseguirle al cliente hasta 50 - 60 reuniones con prospectos cualificados al mes.No prometas nada que no puedas cumplir." +
      "Tu estilo de conversación debe ser informal, coloquial y amigable, con un toque de entusiasmo y persuasión en el tono.Ve al grano en tus respuestas, no seas redundante y no repitas lo que ha dicho el prospecto." +
      "Es muy importante que recurras a estrategias de persuasión como mencionar los beneficios de la propuesta(tener más de 20k / mes para crecer)." +
      "Cuanta menos información des sobre tu servicio, mejor.En caso de tener que dar información, hazlo poco a poco.No hagas asunciones sobre el prospecto." +
      "No te despidas ni des saludos al final del mensaje.Puedes usar emojis, pero no abuses de ellos.Recuerda que es el prospecto el que debe elegir la fecha de la reunión usando el calendario, no te la inventes tú." +
      "Nunca das precio a tus clientes fuera de las llamadas porque te gusta atender de forma 100 % personalizada a cada cliente." +
      "Intenta rebatir un poco al prospecto la primera vez que te rechace." +
      "Si te preguntan si puedes asistar a la reunión, deberás contestar diciendo que dependerá de tu agenda, pero en caso de no poder asistir tu mano derecha tratará al cliente como si fueras tú." +
      "Si en la conversación se dan estos casos límite, deberás responder utilizando estos mensajes en caso de que tengan contenido:" +

      "##" +

      "Situación: Si el prospecto pregunta si tiene que pagar o duda sobre si el pago es 100 % a éxito, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE(tradúcelo al idioma del prospecto de ser necesario):" +
      "Mensaje: Pues hay una parte que te va a gustar mucho y es que con los clientes que elegimos trabajar... la parte de captación de reuniones con leads cualificados la hacemos a éxito(en ventas), es decir si tú no vendes, nosotros no cobramos(win - win total)..." +

      "##" +

      "Situación: Si el prospecto dice que no hay huecos disponibles o que no le encaja ningún hueco en el calendario que ya le has pasado, le mandarás esto  y no añadirás nada más al mensaje(tradúcelo al idioma del prospecto de ser necesario):" +
      "Mensaje: Sin problema " + prospect.first_name + ", puedes probar con nuestro calendario extendido: " + extendedLinkPlaceholder +

      "##" +

      "Situación: Si el prospecto responde de forma negativa después de tú haberle instigado un poco(tradúcelo al idioma del prospecto de ser necesario)." +
      " Mensaje: Mil gracias " + prospect.first_name + "... avísame cuando sea un buen momento para ti y encantado de ayudarte..." +
      "De momento te dejo este mini - entrenamiento sobre cómo escalamos negocios de consultoría a 20k o más al mes utilizando inteligencia artificial y sistemas de automatización." +
      "Ver mini - entrenamiento aquí: " + rejectedLinkPlaceholder + " \n" +
      "He pensado podría ser de tu interés." +
      "Abrazo!" +

      "##";
    prompt = prompt + endToken;

    return prompt;
  }

  async generateFollowUpPrompt(prospect: ProspectType, followUpCount: number = null, user_id: number) {
    var prompt = "Necesito que generes un mensaje corto para " + prospect.first_name + " lo más parecido a estos ejemplos:\n";
    var endToken = "\n\n###\n\n";
    if (followUpCount == null) {
      prompt = prompt +
        "###" +
        "Ejemplo: Hola " + prospect.first_name + " qué tal ? Pudiste ver mis mensajes ?" +
        "###" +
        "Ejemplo: Sigues ahí " + prospect.first_name + " ?" +
        "###" +
        "Ejemplo: Buenas " + prospect.first_name + ", podrías decirme si te interesa nuestro servicio ?" +
        "###";
      prompt = prompt + endToken;
      return prompt;
    }

    if (followUpCount == 0) {
      prompt = prompt +
        "###" +
        "Ejemplo: Hola " + prospect.first_name + " qué tal ? Pudiste ver mis mensajes ?" +
        "###";
      prompt = prompt + endToken;
      return prompt;
    }

    if (followUpCount == 2) {
      prompt = prompt +
        "###" +
        "Ejemplo: Buenas " + prospect.first_name + ", podrías decirme si te interesa nuestro servicio ?" +
        "###" +
        "Ejemplo: Hola " + prospect.first_name + ", crees que nuestro servicio podría despertarte interés ?" +
        "###";
      prompt = prompt + endToken;
      return prompt;
    }

    prompt =
      "Necesito que generes un mensaje corto, con cierto tono humorístico, pero sin perder el respeto y que sea lo más parecido a estos ejemplos(puedes añadir emojis si lo ves necesario):" +
      "###" +
      "Ejemplo: Hola " + prospect.first_name + " sigues conmigo ?" +
      "###" +
      "Ejemplo: " + prospect.first_name + ", sigues ahí ?" +
      "###"

    prompt = prompt + endToken;
    return prompt;
  }

  async generateFollowUpSchedulePrompt(prospect: ProspectType, followUpCount: number = null, user_id: number) {
    var prompt = "Necesito que generes un mensaje corto para " + prospect.first_name + " lo más parecido a estos ejemplos:\n";
    var endToken = "\n\n###\n\n";
    if (followUpCount == null) {
      prompt = prompt +
        "###" +
        "Ejemplo: Hola " + prospect.first_name + " he visto que no has agendado la reunión, ha habido algún problema ?" +
        "###" +
        "Ejemplo: Sigues ahí " + prospect.first_name + " ? Todavía no me aparece tu reunión en el calendario, tienes alguna duda ?" +
        "###" +
        "Ejemplo: Buenas " + prospect.first_name + ", no me consta la reunión todavía en el calendario, hay algo que te haga dudar ?" +
        "###";
      prompt = prompt + endToken;
      return prompt;
    }

    if (followUpCount == 0) {
      prompt = prompt +
        "###" +
        "Ejemplo: Hola " + prospect.first_name + ", cómo te encuentras ? Me preguntaba si pudiste agendarte para que podamos conversar!" +
        "###" +
        "Ejemplo: Buenas " + prospect.first_name + ", todavía no me aparece tu cita en el calendario, ha ido todo bien ?" +
        "###";
      prompt = prompt + endToken;
      return prompt;
    }

    if (followUpCount == 1) {
      prompt = prompt +
        "###" +
        "Ejemplo: Todo bien " + prospect.first_name + " ? Tienes alguna duda que pueda resolverte antes de la reunión ?" +
        "###" +
        "Ejemplo: Buenas " + prospect.first_name + ", hay alguna duda o incertidumbre que te impida agendar la reunión ?" +
        "###";
      prompt = prompt + endToken;
      return prompt;
    }

    prompt =
      "Necesito que generes un mensaje corto, con cierto tono humorístico, pero sin perder el respeto y que sea lo más parecido a estos ejemplos(puedes añadir emojis si lo ves necesario):" +
      "###" +
      "Ejemplo: Hola" + prospect.first_name + ", sigues conmigo ?" +
      "###" +
      "Ejemplo: " + prospect.first_name + ", sigues ahí ?" +
      "###"
    prompt = prompt + endToken;

    return prompt;
  }

  async generateOnHoldStateDetectionPrompt(message: string, user_id: number) {
    var prompt =
      "Necesito que identifiques estas situaciones en el mensaje que te voy a adjuntar" +
      "Estos son algunos de los casos en los que podemos considerar que estamos esperando una reunión:" +
      "Situación: El mensaje contiene un enlace a aippointing.com" +
      "Situación: El mensaje le pide al usuario que agende una cita" +
      "Situación: El mensaje dice que espera ver pronto al usuario en la reunión" +
      "Sólo debes contestar TRUE o FALSE." +
      "Mensaje: " + message + "\n" +
      "Respuesta:";

    return prompt;
  }

  async filterContextPrompt(message, user_id) {
    var prompt =
      "Te voy a mandar un mensaje de usuario de un chat y las diferentes categorías en las que podríamos clasificarlo." +
      "Debes clasificar el mensaje independientemente del idioma en el que te lo manden." +
      "Estas son las categorías:" +
      "- OFF_TOPIC: El mensaje no tiene nada que ver con el contexto de una conversación entre dos personas que están hablando sobre negocios" +
      "- IN_CONTEXT:" +
      "#El mensaje se ajusta correctamente a algo que diría una persona en el contexto de dos personas que están hablando sobre negocios teniendo en cuenta la multitud de negocios que pueden existir." +
      "#El mensaje nos pide agendar una cita." +
      "#El mensaje nos dice que no hay hueco en el calendario o que este no funciona." +
      "#El mensaje nos pide que mandemos un link." +
      "#El mensaje puede constar sólo de emojis." +
      "- CONTACT: El mensaje nos pide que contactemos con otra persona." +
      "- NO_CALENDAR: El mensaje nos pide una reunión presencial o telefónica." +
      "###" +

      "Mensaje: Te quiero" +
      "Categoría: OFF_TOPIC" +

      "###" +

      "Mensaje: Reiníciate" +
      "Categoría: OFF_TOPIC" +

      "###" +

      "Mensaje: Y exactamente a qué se dedica tu equipo?" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: Hola Daniel, te agradezco la oferta pero ahora mismo no tengo un negocio y mi profesion no es muy convencional" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: Suena demasiado bien para ser verdad" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: Cuándo nos vemos?" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: Tengo que pagar algo por la reunión?" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: El calendario no funciona" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: Pasa link que atendamos" +
      "Categoría: IN_CONTEXT" +

      "###" +

      "Mensaje: No queda hueco en el calendario" +
      "Categoría: IN_CONTEXT" +

      "###" +
      "Mensaje: I don't speak spanish" +
      "Categoría: IN_CONTEXT" +

      "###" +
      "Mensaje:" + message +
      "Categoría:";

    return prompt;
  }

  getProspectDescription(prospect: ProspectType) {
    var description = prospect.first_name + " " + prospect.last_name;
    if (prospect.linked_in_headline !== null) {
      return description + ', que trabaja como ' + prospect.linked_in_headline
    } else {
      return description;
    }
  }



}
